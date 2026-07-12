// Service: Copy bài Instagram → Fanpage.
// Mô hình Nguồn (IG của page A) → Đích (page B bất kỳ). App giữ token cả 4 page nên
// đọc IG bằng token page nguồn, đăng bằng token page đích. Chống trùng theo (igMediaId, targetPageId).

import { prisma } from "./db";
import { resolveIgAccount, fetchIgMedia, fetchIgMediaById, resolveMediaUrls } from "./facebook/instagram";
import { publishIgMedia } from "./facebook/pages";
import { rewriteCaption, type Positioning } from "./ai/rewrite";

type PageCfg = { pageId: string; pageAccessToken: string };

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

async function pageCfg(fbPageId: string): Promise<PageCfg | null> {
  const page = await prisma.page.findUnique({ where: { fbPageId } });
  if (!page?.accessToken) return null;
  return { pageId: page.fbPageId, pageAccessToken: page.accessToken };
}

/** Danh sách page nguồn (có IG linked) + page đích (mọi page có token). */
export async function listSourcesAndTargets() {
  const pages = await prisma.page.findMany({ orderBy: { name: "asc" } });
  const targets = pages
    .filter((p) => p.accessToken)
    .map((p) => ({ fbPageId: p.fbPageId, name: p.name, followers: p.followers }));

  const sources: Array<{ fbPageId: string; name: string; igUserId: string; igUsername?: string }> = [];
  for (const p of pages) {
    if (!p.accessToken) continue;
    let igUserId = p.igUserId;
    let igUsername: string | undefined;
    try {
      const ig = await resolveIgAccount({ pageId: p.fbPageId, pageAccessToken: p.accessToken });
      if (ig) {
        igUserId = ig.igUserId;
        igUsername = ig.username;
        if (p.igUserId !== ig.igUserId) await prisma.page.update({ where: { id: p.id }, data: { igUserId } });
      } else {
        igUserId = null;
      }
    } catch {
      /* token có thể chưa có instagram_basic — giữ cache nếu có */
    }
    if (igUserId) sources.push({ fbPageId: p.fbPageId, name: p.name, igUserId, igUsername });
  }
  return { sources, targets };
}

export async function getPositioning(pageFbId: string): Promise<Positioning & { pageId: string }> {
  const row = await prisma.pagePositioning.findUnique({ where: { pageId: pageFbId } });
  return (
    row ?? { pageId: pageFbId, pageName: null, audience: null, voice: null, hashtags: null, cta: null, notes: null }
  );
}

export async function savePositioning(pageFbId: string, data: Record<string, unknown>) {
  const clean = {
    pageName: trimOrNull(data.pageName),
    audience: trimOrNull(data.audience),
    voice: trimOrNull(data.voice),
    hashtags: trimOrNull(data.hashtags),
    cta: trimOrNull(data.cta),
    notes: trimOrNull(data.notes),
  };
  return prisma.pagePositioning.upsert({
    where: { pageId: pageFbId },
    create: { pageId: pageFbId, ...clean },
    update: clean,
  });
}

/** Kéo bài IG của page nguồn + gắn trạng thái đã-copy theo page đích. */
export async function listMedia(opts: { sourceFbId: string; targetFbId: string; after?: string }) {
  const src = await prisma.page.findUnique({ where: { fbPageId: opts.sourceFbId } });
  if (!src?.accessToken) throw new Error("Page nguồn chưa có token.");

  let igUserId = src.igUserId;
  if (!igUserId) {
    const ig = await resolveIgAccount({ pageId: src.fbPageId, pageAccessToken: src.accessToken });
    if (!ig) throw new Error("Page nguồn chưa liên kết tài khoản Instagram.");
    igUserId = ig.igUserId;
    await prisma.page.update({ where: { id: src.id }, data: { igUserId } });
  }

  const { items, nextAfter } = await fetchIgMedia(
    { pageId: src.fbPageId, pageAccessToken: src.accessToken },
    igUserId,
    { after: opts.after },
  );

  const ids = items.map((i) => i.id);
  const copied = ids.length
    ? await prisma.copiedPost.findMany({ where: { igMediaId: { in: ids }, targetPageId: opts.targetFbId } })
    : [];
  const byId = new Map(copied.map((c) => [c.igMediaId, c]));

  return {
    items: items.map((i) => {
      const rec = byId.get(i.id);
      return {
        id: i.id,
        caption: i.caption,
        mediaType: i.mediaType,
        mediaUrl: i.mediaUrl,
        thumbnailUrl: i.thumbnailUrl,
        permalink: i.permalink,
        timestamp: i.timestamp,
        childrenCount: i.children.length,
        copy: rec
          ? { status: rec.status, fbPermalink: rec.fbPermalink, rewrittenCaption: rec.rewrittenCaption, error: rec.error }
          : null,
      };
    }),
    nextAfter,
  };
}

/** Viết lại caption theo định vị page đích. Nếu có igMediaId → lưu bản nháp. */
export async function rewriteFor(opts: {
  igMediaId?: string;
  caption?: string;
  sourceFbId?: string;
  targetFbId: string;
}) {
  let text: string | null = typeof opts.caption === "string" ? opts.caption : null;
  if (text == null && opts.igMediaId && opts.sourceFbId) {
    const src = await pageCfg(opts.sourceFbId);
    if (!src) throw new Error("Page nguồn chưa có token.");
    const media = await fetchIgMediaById(src, opts.igMediaId);
    text = media.caption || "";
  }
  if (text == null) throw new Error("Cần 'caption' hoặc 'igMediaId'+'sourceFbId'.");

  const positioning = await getPositioning(opts.targetFbId);
  const result = await rewriteCaption(text, positioning);

  if (opts.igMediaId) {
    const key = { igMediaId_targetPageId: { igMediaId: opts.igMediaId, targetPageId: opts.targetFbId } };
    const existing = await prisma.copiedPost.findUnique({ where: key });
    const keepPublished = existing?.status === "published";
    await prisma.copiedPost.upsert({
      where: key,
      create: {
        igMediaId: opts.igMediaId,
        targetPageId: opts.targetFbId,
        sourcePageId: opts.sourceFbId ?? null,
        igCaption: text,
        rewrittenCaption: result.caption,
        status: "rewritten",
      },
      update: {
        rewrittenCaption: result.caption,
        ...(opts.sourceFbId ? { sourcePageId: opts.sourceFbId } : {}),
        ...(keepPublished ? {} : { status: "rewritten" }),
      },
    });
  }
  return result;
}

/** Đăng 1 bài IG sang page đích. Chống trùng, re-fetch URL tươi, ghi log kết quả. */
export async function publish(opts: {
  igMediaId: string;
  sourceFbId: string;
  targetFbId: string;
  caption?: string;
  mediaType?: string;
}) {
  const target = await pageCfg(opts.targetFbId);
  if (!target) throw new Error("Page đích chưa có token.");
  const source = await pageCfg(opts.sourceFbId);
  if (!source) throw new Error("Page nguồn chưa có token.");

  const key = { igMediaId_targetPageId: { igMediaId: opts.igMediaId, targetPageId: opts.targetFbId } };
  const existing = await prisma.copiedPost.findUnique({ where: key });
  if (existing?.status === "published" && existing.fbPostId) {
    throw new Error(`Bài này đã đăng sang page đích rồi (${existing.fbPermalink || existing.fbPostId}).`);
  }

  const media = await fetchIgMediaById(source, opts.igMediaId);
  const mediaType = (opts.mediaType || media.mediaType || "IMAGE").toUpperCase();
  const mediaUrls = resolveMediaUrls(media);
  const caption = typeof opts.caption === "string" ? opts.caption : media.caption || "";
  const igTimestamp = media.timestamp ? new Date(media.timestamp) : null;

  try {
    const res = await publishIgMedia(target, { mediaType, caption, mediaUrls });
    const common = {
      sourcePageId: opts.sourceFbId,
      igCaption: media.caption,
      mediaType,
      mediaUrls,
      rewrittenCaption: caption,
      status: "published",
      fbPostId: res.fbPostId,
      fbPermalink: res.fbPermalink,
      publishedAt: new Date(),
      igTimestamp,
      error: null,
    };
    const saved = await prisma.copiedPost.upsert({
      where: key,
      create: { igMediaId: opts.igMediaId, targetPageId: opts.targetFbId, ...common },
      update: common,
    });
    return { ok: true, fbPostId: res.fbPostId, fbPermalink: res.fbPermalink, processing: res.processing ?? false, status: saved.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.copiedPost.upsert({
      where: key,
      create: {
        igMediaId: opts.igMediaId,
        targetPageId: opts.targetFbId,
        sourcePageId: opts.sourceFbId,
        igCaption: media.caption,
        mediaType,
        mediaUrls,
        rewrittenCaption: caption,
        status: "failed",
        error: msg,
        igTimestamp,
      },
      update: { status: "failed", error: msg },
    });
    throw new Error(msg);
  }
}

export async function listCopied(targetFbId?: string) {
  return prisma.copiedPost.findMany({
    where: targetFbId ? { targetPageId: targetFbId } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}
