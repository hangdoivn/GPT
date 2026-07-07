// Luồng OAuth kết nối Facebook + phân giải token lúc chạy.
// Ưu tiên token lưu trong DB (kết nối qua UI), fallback về biến môi trường.

import { prisma } from "../db";
import { getConfig, FacebookApiError, type FacebookConfig } from "./client";

// Quyền cần xin khi đăng nhập. Đủ để đọc lead, ads, bài đăng & insight page.
// Tất cả nằm trong use case "Quản lý Trang" đang ở trạng thái "Sẵn sàng thử nghiệm"
// -> admin/tester của app dùng được ngay, KHÔNG cần App Review.
export const OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement", // đọc bài đăng + tương tác của page (Insights)
  "read_insights", // số liệu page: tiếp cận/tương tác/theo dõi (biểu đồ reach/follow)
  "pages_manage_metadata", // đăng ký webhook leadgen (nhận lead realtime)
  "pages_manage_ads", // FB yêu cầu để đọc leadgen_forms/leads của page (#200)
  "pages_messaging", // đọc hội thoại Messenger (page chạy Click-to-Messenger ads)
  "leads_retrieval",
  "ads_read",
  "business_management",
  // "pages_manage_posts": chỉ cần cho auto-đăng bài — thêm sau khi cần đăng từ app.
];

// Config đã phân giải: page token cho page endpoints, userToken cho Marketing API.
export interface RuntimeConfig extends FacebookConfig {
  userToken: string;
  connectedName?: string | null;
}

const GRAPH_BASE = "https://graph.facebook.com";
const WWW_BASE = "https://www.facebook.com";

/** GET tới Graph API không bắt buộc access_token mặc định (dùng cho oauth endpoints). */
async function fbGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const { graphVersion } = getConfig();
  const url = new URL(`${GRAPH_BASE}/${graphVersion}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = (json.error ?? {}) as { message?: string; code?: number };
    throw new FacebookApiError(err.message ?? `Graph lỗi HTTP ${res.status}`, res.status, err.code);
  }
  return json as T;
}

/**
 * Origin gốc của app để dựng redirect_uri OAuth.
 * Ưu tiên APP_URL (đặt tay), rồi VERCEL_URL (Vercel tự cấp), cuối cùng origin của request.
 */
export function appOrigin(reqOrigin: string): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return reqOrigin;
}

function redirectUri(origin: string): string {
  return `${origin}/api/auth/facebook/callback`;
}

/** URL đưa user tới trang đăng nhập & cấp quyền Facebook. */
export function buildLoginUrl(origin: string, state: string): string {
  const { appId, graphVersion } = getConfig();
  const u = new URL(`${WWW_BASE}/${graphVersion}/dialog/oauth`);
  u.searchParams.set("client_id", appId);
  u.searchParams.set("redirect_uri", redirectUri(origin));
  u.searchParams.set("scope", OAUTH_SCOPES.join(","));
  u.searchParams.set("state", state);
  u.searchParams.set("response_type", "code");
  // Ép Facebook hỏi lại quyền chưa cấp (vd pages_read_engagement chưa hiệu lực cho page)
  // và hiện lại bước "chọn page" để user cấp đủ.
  u.searchParams.set("auth_type", "rerequest");
  return u.toString();
}

/** Đổi authorization code -> short-lived user token. */
async function exchangeCode(origin: string, code: string): Promise<string> {
  const { appId, appSecret } = getConfig();
  const r = await fbGet<{ access_token: string }>("oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri(origin),
    code,
  });
  return r.access_token;
}

/** Đổi short-lived -> long-lived user token (~60 ngày). */
async function toLongLived(shortToken: string): Promise<{ token: string; expiresIn?: number }> {
  const { appId, appSecret } = getConfig();
  const r = await fbGet<{ access_token: string; expires_in?: number }>("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
  return { token: r.access_token, expiresIn: r.expires_in };
}

interface FbPageEntry {
  id: string;
  name: string;
  category?: string;
  fan_count?: number;
  access_token?: string;
}

/**
 * Hoàn tất OAuth: đổi code -> long-lived token, lấy danh sách page + ad account,
 * lưu tất cả vào DB. Trả về tên user và số page kết nối được.
 */
export async function completeOAuth(
  origin: string,
  code: string,
): Promise<{ name: string | null; pages: number }> {
  const shortToken = await exchangeCode(origin, code);
  const { token: userToken, expiresIn } = await toLongLived(shortToken);

  // Tên user để hiển thị.
  let name: string | null = null;
  try {
    const me = await fbGet<{ name?: string }>("me", { access_token: userToken, fields: "name" });
    name = me.name ?? null;
  } catch {
    /* không chặn nếu thiếu quyền đọc tên */
  }

  // Danh sách page user quản lý (kèm page access token).
  const pagesRes = await fbGet<{ data: FbPageEntry[] }>("me/accounts", {
    access_token: userToken,
    fields: "id,name,category,fan_count,access_token",
  });
  const pages = pagesRes.data ?? [];

  for (const p of pages) {
    await prisma.page.upsert({
      where: { fbPageId: p.id },
      create: {
        fbPageId: p.id,
        name: p.name,
        category: p.category ?? null,
        followers: p.fan_count ?? 0,
        accessToken: p.access_token ?? null,
      },
      update: {
        name: p.name,
        category: p.category ?? null,
        followers: p.fan_count ?? 0,
        ...(p.access_token ? { accessToken: p.access_token } : {}),
      },
    });
  }

  // Ad account đầu tiên (nếu có) cho Marketing API.
  let adAccountId: string | null = null;
  try {
    const ads = await fbGet<{ data: { id: string }[] }>("me/adaccounts", {
      access_token: userToken,
      fields: "id",
    });
    adAccountId = ads.data?.[0]?.id ?? null; // id đã ở dạng act_XXXX
  } catch {
    /* user có thể không có ad account */
  }

  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  const activePageFbId = pages[0]?.id ?? null;

  await prisma.fbConnection.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      userToken,
      userTokenExpiresAt: expiresAt,
      activePageFbId,
      adAccountId,
      connectedName: name,
    },
    update: {
      userToken,
      userTokenExpiresAt: expiresAt,
      activePageFbId,
      adAccountId,
      connectedName: name,
    },
  });

  return { name, pages: pages.length };
}

/**
 * Lấy lại page access token MỚI từ user token hiện tại (đã có đủ quyền).
 * Fix lỗi (#10) khi page token lưu trong DB cũ/thiếu quyền: user token đã được
 * cấp pages_read_engagement/read_insights nhưng page token cũ thì chưa.
 * Không cần đăng nhập lại toàn bộ.
 */
export async function refreshPageTokens(): Promise<{ updated: number } | null> {
  const conn = await prisma.fbConnection.findUnique({ where: { id: "singleton" } });
  if (!conn?.userToken) return null;
  try {
    const res = await fbGet<{ data: FbPageEntry[] }>("me/accounts", {
      access_token: conn.userToken,
      fields: "id,name,category,fan_count,access_token",
    });
    const pages = res.data ?? [];
    let updated = 0;
    for (const p of pages) {
      if (!p.access_token) continue;
      await prisma.page.upsert({
        where: { fbPageId: p.id },
        create: {
          fbPageId: p.id,
          name: p.name,
          category: p.category ?? null,
          followers: p.fan_count ?? 0,
          accessToken: p.access_token,
        },
        update: {
          name: p.name,
          followers: p.fan_count ?? 0,
          accessToken: p.access_token, // luôn ghi đè bằng token mới
        },
      });
      updated++;
    }
    return { updated };
  } catch {
    return null;
  }
}

/** Xoá kết nối (đăng xuất khỏi Facebook trong app). */
export async function disconnect(): Promise<void> {
  await prisma.fbConnection.deleteMany({});
}

/** Chọn page khác làm page đang quản lý. */
export async function setActivePage(fbPageId: string): Promise<void> {
  await prisma.fbConnection.update({
    where: { id: "singleton" },
    data: { activePageFbId: fbPageId },
  });
}

/**
 * Phân giải config lúc chạy: ưu tiên DB (kết nối OAuth), fallback env.
 */
export async function resolveConfig(): Promise<RuntimeConfig> {
  const env = getConfig();
  const conn = await prisma.fbConnection.findUnique({ where: { id: "singleton" } });

  if (!conn) {
    return { ...env, userToken: env.pageAccessToken, connectedName: null };
  }

  let pageAccessToken = env.pageAccessToken;
  let pageId = env.pageId;
  if (conn.activePageFbId) {
    const page = await prisma.page.findUnique({ where: { fbPageId: conn.activePageFbId } });
    if (page?.accessToken) {
      pageAccessToken = page.accessToken;
      pageId = page.fbPageId;
    }
  }

  return {
    ...env,
    pageAccessToken: pageAccessToken || env.pageAccessToken,
    pageId: pageId || env.pageId,
    adAccountId: conn.adAccountId || env.adAccountId,
    userToken: conn.userToken || env.pageAccessToken,
    connectedName: conn.connectedName,
  };
}

/** Đã có đủ token để gọi Facebook thật chưa. */
export async function isConnected(): Promise<boolean> {
  const cfg = await resolveConfig();
  return Boolean(cfg.pageAccessToken && cfg.pageId);
}

export interface PermissionState {
  permission: string;
  status: "granted" | "declined" | "missing";
}

/**
 * Đọc danh sách quyền user đã cấp cho app (/me/permissions).
 * Dùng để chẩn đoán vì sao endpoint page bị (#10): quyền chưa granted trong token.
 * Trả về đủ OAUTH_SCOPES, kèm trạng thái granted/declined/missing.
 */
export async function fetchGrantedPermissions(): Promise<PermissionState[] | null> {
  const conn = await prisma.fbConnection.findUnique({ where: { id: "singleton" } });
  const token = conn?.userToken;
  if (!token) return null;
  try {
    const json = await fbGet<{ data: { permission: string; status: string }[] }>("me/permissions", {
      access_token: token,
    });
    const byName = new Map<string, string>();
    for (const p of json.data ?? []) byName.set(p.permission, p.status);
    return OAUTH_SCOPES.map((permission) => {
      const status = byName.get(permission);
      return {
        permission,
        status: status === "granted" ? "granted" : status === "declined" ? "declined" : "missing",
      } as PermissionState;
    });
  } catch {
    return null;
  }
}

/** App credentials (appId/secret) đã cấu hình chưa — điều kiện để chạy OAuth. */
export function hasAppCredentials(): boolean {
  const c = getConfig();
  return Boolean(c.appId && c.appSecret);
}
