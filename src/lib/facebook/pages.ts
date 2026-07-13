// Quản lý fanpage & bài đăng qua Graph API.

import { graph, graphAll, type FacebookConfig } from "./client";

type PageCfg = Pick<FacebookConfig, "pageId" | "pageAccessToken">;

export interface FbPage {
  id: string;
  name: string;
  category?: string;
  fan_count?: number;
  access_token?: string;
}

/** Danh sách page mà user quản lý (/me/accounts). */
export async function fetchManagedPages(userToken?: string): Promise<FbPage[]> {
  return graphAll<FbPage>("me/accounts", {
    params: { fields: "id,name,category,fan_count,access_token" },
    token: userToken,
  });
}

/** Thông tin 1 page. */
export async function fetchPage(cfg: PageCfg): Promise<FbPage> {
  return graph<FbPage>(cfg.pageId, {
    token: cfg.pageAccessToken,
    params: { fields: "id,name,category,fan_count" },
  });
}

export interface FbPost {
  id: string;
  message?: string;
  created_time: string;
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
}

/** Bài đăng gần đây của page kèm số tương tác. */
export async function fetchPosts(cfg: PageCfg): Promise<FbPost[]> {
  return graphAll<FbPost>(`${cfg.pageId}/posts`, {
    token: cfg.pageAccessToken,
    params: {
      fields:
        "id,message,created_time,likes.summary(true),comments.summary(true),shares",
    },
  });
}

export interface FbMediaPost {
  id: string;
  message?: string;
  full_picture?: string;
  permalink_url?: string;
  created_time: string;
}

export interface FbScheduledPost {
  id: string;
  message?: string;
  scheduled_publish_time?: number;
  full_picture?: string;
}

/** Bài ĐÃ LÊN LỊCH trên Page (chưa đăng) — để hiện trên lịch. */
export async function fetchScheduledPosts(cfg: PageCfg): Promise<FbScheduledPost[]> {
  const res = await graph<{ data?: FbScheduledPost[] }>(`${cfg.pageId}/scheduled_posts`, {
    token: cfg.pageAccessToken,
    params: { fields: "id,message,scheduled_publish_time,full_picture", limit: 100 },
  });
  return res.data ?? [];
}

/** Bài FB gần đây CÓ ẢNH (dùng lại làm asset trong Planner). */
export async function fetchPageMediaPosts(cfg: PageCfg): Promise<FbMediaPost[]> {
  const posts = await graphAll<FbMediaPost>(
    `${cfg.pageId}/posts`,
    {
      token: cfg.pageAccessToken,
      params: { fields: "id,message,full_picture,permalink_url,created_time", limit: 50 },
    },
    2,
  );
  return posts.filter((p) => p.full_picture);
}

/** Đăng bài mới (hoặc lên lịch nếu truyền scheduledUnix). */
export async function publishPost(
  cfg: PageCfg,
  message: string,
  scheduledUnix?: number,
): Promise<{ id: string }> {
  const body: Record<string, unknown> = { message };
  if (scheduledUnix) {
    body.published = false;
    body.scheduled_publish_time = scheduledUnix;
  }
  return graph<{ id: string }>(`${cfg.pageId}/feed`, {
    token: cfg.pageAccessToken,
    method: "POST",
    body,
  });
}

// ─── Đăng media (Copy IG → Fanpage) ────────────────────────────
// FB tự fetch ảnh/video từ URL của IG lúc gọi → không cần tải media về server.

export interface PublishMediaResult {
  fbPostId: string;
  fbPermalink: string | null;
  processing?: boolean; // video: FB xử lý bất đồng bộ
}

// Truyền scheduledUnix (epoch giây) để LÊN LỊCH thay vì đăng ngay (published=false).
function schedule(body: Record<string, unknown>, scheduledUnix?: number) {
  if (scheduledUnix && scheduledUnix > 0) {
    body.published = false;
    body.scheduled_publish_time = scheduledUnix;
  }
  return body;
}

/** Đăng/hẹn giờ 1 ảnh: POST {pageId}/photos (FB fetch ảnh từ url). */
export async function publishPhoto(
  cfg: PageCfg,
  url: string,
  caption: string,
  scheduledUnix?: number,
): Promise<PublishMediaResult> {
  const res = await graph<{ id: string; post_id?: string }>(`${cfg.pageId}/photos`, {
    token: cfg.pageAccessToken,
    method: "POST",
    body: schedule({ url, caption, published: true }, scheduledUnix),
  });
  const postId = res.post_id ?? res.id;
  return { fbPostId: String(postId), fbPermalink: postId ? `https://www.facebook.com/${postId}` : null };
}

/** Đăng/hẹn giờ nhiều ảnh: upload từng ảnh (unpublished) → gom vào 1 post /feed. */
export async function publishCarousel(
  cfg: PageCfg,
  urls: string[],
  message: string,
  scheduledUnix?: number,
): Promise<PublishMediaResult> {
  const fbids: string[] = [];
  for (const url of urls) {
    const up = await graph<{ id: string }>(`${cfg.pageId}/photos`, {
      token: cfg.pageAccessToken,
      method: "POST",
      body: { url, published: false }, // ảnh con luôn unpublished, gom vào feed
    });
    if (up.id) fbids.push(String(up.id));
  }
  if (fbids.length === 0) throw new Error("Không upload được ảnh nào cho carousel.");
  const res = await graph<{ id: string }>(`${cfg.pageId}/feed`, {
    token: cfg.pageAccessToken,
    method: "POST",
    body: schedule({ message, attached_media: fbids.map((media_fbid) => ({ media_fbid })), published: true }, scheduledUnix),
  });
  return { fbPostId: String(res.id), fbPermalink: res.id ? `https://www.facebook.com/${res.id}` : null };
}

/** Đăng/hẹn giờ video: POST {pageId}/videos với file_url (bất đồng bộ). */
export async function publishVideo(
  cfg: PageCfg,
  url: string,
  description: string,
  scheduledUnix?: number,
): Promise<PublishMediaResult> {
  const res = await graph<{ id: string }>(`${cfg.pageId}/videos`, {
    token: cfg.pageAccessToken,
    method: "POST",
    body: schedule({ file_url: url, description, published: true }, scheduledUnix),
  });
  return {
    fbPostId: String(res.id),
    fbPermalink: res.id ? `https://www.facebook.com/${cfg.pageId}/videos/${res.id}` : null,
    processing: true,
  };
}

/**
 * Đăng/hẹn giờ 1 bài lên Page, tự chọn cách theo mediaType.
 * TEXT (không media) → /feed; IMAGE → /photos; VIDEO → /videos; CAROUSEL_ALBUM → nhiều ảnh /feed.
 */
export async function publishMedia(
  cfg: PageCfg,
  input: { mediaType: string; caption: string; mediaUrls: string[]; scheduledUnix?: number },
): Promise<PublishMediaResult> {
  const type = String(input.mediaType || "TEXT").toUpperCase();
  const urls = (input.mediaUrls || []).filter((u) => typeof u === "string" && u);
  const caption = input.caption ?? "";
  const s = input.scheduledUnix;

  if (type === "TEXT" || urls.length === 0) {
    if (!caption.trim()) throw new Error("Bài chữ cần có nội dung.");
    const res = await publishPost(cfg, caption, s);
    return { fbPostId: String(res.id), fbPermalink: res.id ? `https://www.facebook.com/${res.id}` : null };
  }
  if (type === "VIDEO") return publishVideo(cfg, urls[0], caption, s);
  if (type === "CAROUSEL_ALBUM" && urls.length > 1) return publishCarousel(cfg, urls, caption, s);
  return publishPhoto(cfg, urls[0], caption, s);
}

/** Alias tương thích (Copy IG→Fanpage dùng — không hẹn giờ). */
export async function publishIgMedia(
  cfg: PageCfg,
  input: { mediaType: string; caption: string; mediaUrls: string[] },
): Promise<PublishMediaResult> {
  return publishMedia(cfg, input);
}
