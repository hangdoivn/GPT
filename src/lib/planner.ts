// Service Content Planner (Phase 1: Facebook Page).
// Tạo/nháp/lên lịch/đăng bài lên Page; asset = upload / bài IG cũ / bài FB cũ / URL.
// Lên lịch dùng FB-native (scheduled_publish_time) — FB tự đăng đúng giờ.

import { prisma } from "./db";
import { fetchIgMediaById, resolveMediaUrls } from "./facebook/instagram";
import { publishMedia, fetchPageMediaPosts, fetchScheduledPosts, type PublishMediaResult } from "./facebook/pages";
import { graph } from "./facebook/client";

type PageCfg = { pageId: string; pageAccessToken: string };

// FB cho phép lên lịch từ ~10 phút tới 75 ngày.
const MIN_LEAD_S = 10 * 60;
const MAX_LEAD_S = 75 * 24 * 3600;

function str(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

async function pageCfg(fbPageId: string): Promise<PageCfg | null> {
  const page = await prisma.page.findUnique({ where: { fbPageId } });
  if (!page?.accessToken) return null;
  return { pageId: page.fbPageId, pageAccessToken: page.accessToken };
}

async function internalPageId(fbPageId: string): Promise<string> {
  const page = await prisma.page.findUnique({ where: { fbPageId } });
  if (!page) throw new Error("Page đích không có trong hệ thống — đăng nhập lại Facebook.");
  return page.id;
}

type PostRow = {
  id: string;
  content: string;
  status: string;
  mediaType: string | null;
  mediaUrls: unknown;
  mediaUrl: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  fbPostId: string | null;
  fbPermalink: string | null;
  error: string | null;
  page?: { fbPageId: string; name: string } | null;
};

function shape(p: PostRow) {
  const urls = Array.isArray(p.mediaUrls) ? (p.mediaUrls as string[]) : p.mediaUrl ? [p.mediaUrl] : [];
  return {
    id: p.id,
    content: p.content,
    status: p.status,
    mediaType: p.mediaType,
    mediaUrls: urls,
    thumbnail: urls[0] ?? null,
    scheduledAt: p.scheduledAt,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    fbPostId: p.fbPostId,
    fbPermalink: p.fbPermalink,
    error: p.error,
    pageName: p.page?.name ?? null,
    targetFbId: p.page?.fbPageId ?? null,
    origin: "app" as const,
  };
}

/** Bài lấy trực tiếp từ Facebook (đã lên lịch / đã đăng) — hiển thị, không sửa qua app. */
function fbShape(input: {
  id: string;
  message?: string;
  image?: string;
  status: string;
  targetFbId: string;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  permalink?: string | null;
}) {
  const at = input.scheduledAt || input.publishedAt || new Date();
  return {
    id: `fb_${input.id}`,
    content: input.message ?? "",
    status: input.status,
    mediaType: input.image ? "IMAGE" : "TEXT",
    mediaUrls: input.image ? [input.image] : [],
    thumbnail: input.image ?? null,
    scheduledAt: input.scheduledAt ? input.scheduledAt.toISOString() : null,
    publishedAt: input.publishedAt ? input.publishedAt.toISOString() : null,
    createdAt: at.toISOString(),
    fbPostId: input.id,
    fbPermalink: input.permalink ?? (input.status === "published" ? `https://www.facebook.com/${input.id}` : null),
    error: null,
    pageName: null,
    targetFbId: input.targetFbId,
    origin: "fb" as const,
  };
}

function inRange(d: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return true;
  return d >= from && d < to;
}

/**
 * Bài trong khoảng thời gian cho lưới lịch = bài tạo qua app + (nếu có pageFbId) bài
 * ĐÃ LÊN LỊCH & ĐÃ ĐĂNG lấy trực tiếp từ Facebook (kể cả bài lên lịch ngoài app).
 */
export async function listPlannerPosts(fromISO?: string, toISO?: string, pageFbId?: string) {
  const from = fromISO ? new Date(fromISO) : null;
  const to = toISO ? new Date(toISO) : null;
  const rangeOk = from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime());

  const appPosts = await prisma.post.findMany({
    where: {
      ...(rangeOk
        ? {
            OR: [
              { scheduledAt: { gte: from!, lte: to! } },
              { publishedAt: { gte: from!, lte: to! } },
              { scheduledAt: null, publishedAt: null, createdAt: { gte: from!, lte: to! } },
            ],
          }
        : {}),
      ...(pageFbId ? { page: { fbPageId: pageFbId } } : {}),
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    include: { page: { select: { fbPageId: true, name: true } } },
    take: 500,
  });
  const appShaped = appPosts.map((p) => shape(p as unknown as PostRow));

  if (!pageFbId) return appShaped;
  const cfg = await pageCfg(pageFbId);
  if (!cfg) return appShaped;

  // Bài đã có trong app (đã gắn fbPostId) thì không lấy lại từ FB.
  const appFbIds = new Set(appShaped.map((p) => p.fbPostId).filter((x): x is string => Boolean(x)));

  const [scheduled, published] = await Promise.all([
    fetchScheduledPosts(cfg).catch(() => []),
    fetchPageMediaPosts(cfg).catch(() => []),
  ]);

  const fbShaped: ReturnType<typeof fbShape>[] = [];
  for (const s of scheduled) {
    if (!s.scheduled_publish_time || appFbIds.has(s.id)) continue;
    const when = new Date(s.scheduled_publish_time * 1000);
    if (!inRange(when, from, to)) continue;
    fbShaped.push(fbShape({ id: s.id, message: s.message, image: s.full_picture, status: "scheduled", targetFbId: pageFbId, scheduledAt: when, publishedAt: null }));
  }
  for (const p of published) {
    if (appFbIds.has(p.id)) continue;
    const when = new Date(p.created_time);
    if (!inRange(when, from, to)) continue;
    fbShaped.push(fbShape({ id: p.id, message: p.message, image: p.full_picture, status: "published", targetFbId: pageFbId, scheduledAt: null, publishedAt: when, permalink: p.permalink_url }));
  }
  return [...appShaped, ...fbShaped];
}

async function persist(data: {
  internalId: string;
  caption: string;
  mediaType: string;
  mediaUrls: string[];
  source: string;
  sourceIgMediaId?: string | null;
  sourceFbId?: string | null;
  status: string;
  fbPostId?: string | null;
  fbPermalink?: string | null;
  error?: string | null;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
}) {
  const row = await prisma.post.create({
    data: {
      pageId: data.internalId,
      content: data.caption,
      mediaType: data.mediaType,
      mediaUrls: data.mediaUrls,
      mediaUrl: data.mediaUrls[0] ?? null,
      source: data.source,
      sourceIgMediaId: data.sourceIgMediaId ?? null,
      sourceFbId: data.sourceFbId ?? null,
      status: data.status,
      fbPostId: data.fbPostId ?? null,
      fbPermalink: data.fbPermalink ?? null,
      error: data.error ?? null,
      scheduledAt: data.scheduledAt ?? null,
      publishedAt: data.publishedAt ?? null,
    },
    include: { page: { select: { fbPageId: true, name: true } } },
  });
  return shape(row as unknown as PostRow);
}

/** Re-resolve URL tươi nếu asset lấy từ bài IG (URL ký hết hạn nhanh). */
async function resolveAssets(input: {
  mediaType: string;
  mediaUrls: string[];
  sourceIgMediaId?: string | null;
  sourceFbId?: string | null;
}): Promise<{ mediaType: string; mediaUrls: string[] }> {
  if (input.sourceIgMediaId && input.sourceFbId) {
    const src = await pageCfg(input.sourceFbId);
    if (src) {
      const media = await fetchIgMediaById(src, input.sourceIgMediaId);
      return { mediaType: media.mediaType, mediaUrls: resolveMediaUrls(media) };
    }
  }
  return { mediaType: input.mediaType, mediaUrls: input.mediaUrls };
}

function validateSchedule(scheduledAt: Date): number {
  const unix = Math.floor(scheduledAt.getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  if (unix < now + MIN_LEAD_S) throw new Error("Lịch phải cách hiện tại ít nhất ~10 phút (yêu cầu của Facebook).");
  if (unix > now + MAX_LEAD_S) throw new Error("Lịch không được quá 75 ngày (yêu cầu của Facebook).");
  return unix;
}

export interface PlannerInput {
  targetFbId?: string;
  caption?: string;
  mediaType?: string;
  mediaUrls?: string[];
  source?: string;
  sourceIgMediaId?: string;
  sourceFbId?: string;
  scheduledAt?: string; // ISO
  publishNow?: boolean;
}

/** Tạo bài: nháp (không lịch/không đăng), lên lịch, hoặc đăng ngay. */
export async function createPlannerPost(body: PlannerInput) {
  const targetFbId = str(body.targetFbId);
  if (!targetFbId) throw new Error("Thiếu page đích.");
  const internalId = await internalPageId(targetFbId);

  const caption = typeof body.caption === "string" ? body.caption : "";
  let mediaType = (str(body.mediaType) || "TEXT").toUpperCase();
  let mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls.filter((u): u is string => Boolean(u)) : [];
  const source = str(body.source) || "manual";
  const sourceIgMediaId = str(body.sourceIgMediaId);
  const sourceFbId = str(body.sourceFbId);
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  const publishNow = Boolean(body.publishNow);

  if (mediaUrls.length === 0 && mediaType !== "TEXT") mediaType = "TEXT";
  if (mediaType === "TEXT" && !caption.trim()) throw new Error("Bài chữ cần có nội dung.");
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new Error("Thời gian lên lịch không hợp lệ.");

  // Nháp: chỉ lưu, không gọi FB.
  if (!publishNow && !scheduledAt) {
    return persist({ internalId, caption, mediaType, mediaUrls, source, sourceIgMediaId, sourceFbId, status: "draft" });
  }

  const cfg = await pageCfg(targetFbId);
  if (!cfg) throw new Error("Page đích chưa có token — đăng nhập lại Facebook.");

  const resolved = await resolveAssets({ mediaType, mediaUrls, sourceIgMediaId, sourceFbId });
  mediaType = resolved.mediaType;
  mediaUrls = resolved.mediaUrls;

  const scheduledUnix = scheduledAt ? validateSchedule(scheduledAt) : undefined;

  try {
    const res: PublishMediaResult = await publishMedia(cfg, { mediaType, caption, mediaUrls, scheduledUnix });
    return persist({
      internalId,
      caption,
      mediaType,
      mediaUrls,
      source,
      sourceIgMediaId,
      sourceFbId,
      status: scheduledAt ? "scheduled" : "published",
      fbPostId: res.fbPostId,
      fbPermalink: res.fbPermalink,
      scheduledAt,
      publishedAt: scheduledAt ? null : new Date(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await persist({ internalId, caption, mediaType, mediaUrls, source, sourceIgMediaId, sourceFbId, status: "failed", error: msg, scheduledAt });
    throw new Error(msg);
  }
}

/** Sửa bài NHÁP (caption/media/lịch); nếu kèm publishNow/scheduledAt thì đăng/lên lịch luôn. */
export async function updatePlannerPost(id: string, body: PlannerInput) {
  const existing = await prisma.post.findUnique({ where: { id }, include: { page: { select: { fbPageId: true } } } });
  if (!existing) throw new Error("Không tìm thấy bài.");
  if (existing.status === "published") throw new Error("Bài đã đăng, không sửa được ở đây.");

  const caption = typeof body.caption === "string" ? body.caption : existing.content;
  const mediaType = (str(body.mediaType) || existing.mediaType || "TEXT").toUpperCase();
  const mediaUrls = Array.isArray(body.mediaUrls)
    ? body.mediaUrls.filter((u): u is string => Boolean(u))
    : (Array.isArray(existing.mediaUrls) ? (existing.mediaUrls as string[]) : existing.mediaUrl ? [existing.mediaUrl] : []);
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  const publishNow = Boolean(body.publishNow);
  const targetFbId = existing.page?.fbPageId;
  const source = str(body.source) ?? existing.source ?? "manual";
  const sourceIgMediaId = str(body.sourceIgMediaId) ?? existing.sourceIgMediaId ?? undefined;
  const sourceFbId = str(body.sourceFbId) ?? existing.sourceFbId ?? undefined;

  // Chỉ cập nhật nháp.
  if (!publishNow && !scheduledAt) {
    const row = await prisma.post.update({
      where: { id },
      data: {
        content: caption,
        mediaType,
        mediaUrls,
        mediaUrl: mediaUrls[0] ?? null,
        source,
        sourceIgMediaId: sourceIgMediaId ?? null,
        sourceFbId: sourceFbId ?? null,
      },
      include: { page: { select: { fbPageId: true, name: true } } },
    });
    return shape(row as unknown as PostRow);
  }

  // Chuyển nháp → đăng/lên lịch: nếu đã có bài FB (scheduled) thì huỷ trước rồi tạo mới cho gọn.
  if (existing.fbPostId) {
    await deleteFbPost(targetFbId, existing.fbPostId).catch(() => {});
  }
  await prisma.post.delete({ where: { id } }).catch(() => {});
  return createPlannerPost({
    targetFbId,
    caption,
    mediaType,
    mediaUrls,
    source,
    sourceIgMediaId,
    sourceFbId,
    scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
    publishNow,
  });
}

async function deleteFbPost(fbPageId: string | undefined, fbPostId: string) {
  if (!fbPageId) return;
  const cfg = await pageCfg(fbPageId);
  if (!cfg) return;
  await graph(fbPostId, { token: cfg.pageAccessToken, method: "DELETE" });
}

/** Xoá/huỷ bài (nháp hoặc đã lên lịch). Bài đã lên lịch → cố gắng xoá cả trên FB. */
export async function deletePlannerPost(id: string) {
  const existing = await prisma.post.findUnique({ where: { id }, include: { page: { select: { fbPageId: true } } } });
  if (!existing) return { ok: true };
  if (existing.fbPostId && existing.status === "scheduled") {
    await deleteFbPost(existing.page?.fbPageId, existing.fbPostId).catch(() => {});
  }
  await prisma.post.delete({ where: { id } });
  return { ok: true };
}

/** Bài FB cũ (có ảnh) để chọn làm asset. */
export async function listFbAssets(fbPageId: string) {
  const cfg = await pageCfg(fbPageId);
  if (!cfg) throw new Error("Page chưa có token.");
  const posts = await fetchPageMediaPosts(cfg);
  return posts.map((p) => ({
    id: p.id,
    message: p.message ?? null,
    imageUrl: p.full_picture ?? null,
    permalink: p.permalink_url ?? null,
    createdTime: p.created_time,
  }));
}
