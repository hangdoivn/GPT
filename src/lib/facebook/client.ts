// Client gọi Facebook Graph API + Marketing API.
// Đọc cấu hình từ env. Nếu chưa cấu hình token, các hàm sẽ ném lỗi rõ ràng
// để tầng trên (API route) chuyển sang chế độ demo/CSV thay vì crash.

export interface FacebookConfig {
  appId: string;
  appSecret: string;
  pageAccessToken: string;
  pageId: string;
  adAccountId: string;
  graphVersion: string;
}

export function getConfig(): FacebookConfig {
  return {
    appId: process.env.FACEBOOK_APP_ID ?? "",
    appSecret: process.env.FACEBOOK_APP_SECRET ?? "",
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "",
    pageId: process.env.FACEBOOK_PAGE_ID ?? "",
    adAccountId: process.env.FACEBOOK_AD_ACCOUNT_ID ?? "",
    graphVersion: process.env.FACEBOOK_GRAPH_VERSION ?? "v21.0",
  };
}

/** App đã có đủ token để gọi Facebook thật hay chưa. */
export function isConfigured(): boolean {
  const c = getConfig();
  return Boolean(c.pageAccessToken && c.pageId);
}

export class FacebookApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fbCode?: number,
  ) {
    super(message);
    this.name = "FacebookApiError";
  }
}

const GRAPH_BASE = "https://graph.facebook.com";

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  params?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
  token?: string; // ghi đè access token mặc định
}

/**
 * Gọi Graph API và trả về JSON đã parse. Ném FacebookApiError nếu thất bại.
 */
export async function graph<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const cfg = getConfig();
  const token = opts.token ?? cfg.pageAccessToken;
  if (!token) {
    throw new FacebookApiError("Chưa cấu hình FACEBOOK_PAGE_ACCESS_TOKEN", 401);
  }

  const url = new URL(`${GRAPH_BASE}/${cfg.graphVersion}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    // Facebook data thay đổi liên tục — không cache.
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok || (json.error as Record<string, unknown> | undefined)) {
    const err = (json.error ?? {}) as { message?: string; code?: number };
    throw new FacebookApiError(
      err.message ?? `Graph API lỗi (HTTP ${res.status})`,
      res.status,
      err.code,
    );
  }

  return json as T;
}

/** Duyệt hết các trang phân trang của Graph API (field `data` + `paging.next`). */
export async function graphAll<T = unknown>(
  path: string,
  opts: RequestOptions = {},
  maxPages = 20,
): Promise<T[]> {
  const out: T[] = [];
  let page = await graph<{ data: T[]; paging?: { cursors?: { after?: string } } }>(path, opts);
  out.push(...(page.data ?? []));

  let pages = 1;
  let after = page.paging?.cursors?.after;
  while (after && pages < maxPages) {
    page = await graph<{ data: T[]; paging?: { cursors?: { after?: string } } }>(path, {
      ...opts,
      params: { ...opts.params, after },
    });
    out.push(...(page.data ?? []));
    after = page.paging?.cursors?.after;
    pages++;
  }
  return out;
}
