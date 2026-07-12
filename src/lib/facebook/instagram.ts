// Đọc bài từ Instagram Business/Creator liên kết với một Page (Copy IG → Fanpage).
// Dùng chung graph() của client.ts. Cần quyền instagram_basic trong token của page nguồn.

import { graph, type FacebookConfig } from "./client";

type PageCfg = Pick<FacebookConfig, "pageId" | "pageAccessToken">;

export interface IgAccount {
  igUserId: string;
  username?: string;
}

/** Tài khoản IG business liên kết với page (nếu có). Trả null nếu page chưa nối IG. */
export async function resolveIgAccount(cfg: PageCfg): Promise<IgAccount | null> {
  const res = await graph<{ instagram_business_account?: { id: string; username?: string } }>(cfg.pageId, {
    token: cfg.pageAccessToken,
    params: { fields: "instagram_business_account{id,username}" },
  });
  const iba = res.instagram_business_account;
  return iba?.id ? { igUserId: iba.id, username: iba.username } : null;
}

export interface IgChild {
  id?: string;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
}

export interface IgMediaItem {
  id: string;
  caption: string | null;
  mediaType: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  children: IgChild[];
}

interface IgMediaRaw {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  children?: { data?: Array<{ id?: string; media_type?: string; media_url?: string; thumbnail_url?: string }> };
}

const IG_FIELDS =
  "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}";

function mapMedia(raw: IgMediaRaw): IgMediaItem {
  return {
    id: String(raw.id),
    caption: raw.caption ?? null,
    mediaType: String(raw.media_type ?? "IMAGE"),
    mediaUrl: raw.media_url ?? null,
    thumbnailUrl: raw.thumbnail_url ?? null,
    permalink: raw.permalink ?? null,
    timestamp: raw.timestamp ?? null,
    children: (raw.children?.data ?? []).map((c) => ({
      id: c.id,
      mediaType: String(c.media_type ?? "IMAGE"),
      mediaUrl: c.media_url ?? null,
      thumbnailUrl: c.thumbnail_url ?? null,
    })),
  };
}

/** Danh sách URL media để đăng: carousel → ảnh con; ảnh/video → media_url. */
export function resolveMediaUrls(item: IgMediaItem): string[] {
  if (item.mediaType.toUpperCase() === "CAROUSEL_ALBUM") {
    const urls = item.children.map((c) => c.mediaUrl).filter((u): u is string => Boolean(u));
    return urls.length ? urls : item.mediaUrl ? [item.mediaUrl] : [];
  }
  return item.mediaUrl ? [item.mediaUrl] : [];
}

/** Kéo bài IG (mới nhất trước), có phân trang cursor. */
export async function fetchIgMedia(
  cfg: PageCfg,
  igUserId: string,
  opts: { limit?: number; after?: string } = {},
): Promise<{ items: IgMediaItem[]; nextAfter: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 50);
  const res = await graph<{
    data?: IgMediaRaw[];
    paging?: { cursors?: { after?: string }; next?: string };
  }>(`${igUserId}/media`, {
    token: cfg.pageAccessToken,
    params: { fields: IG_FIELDS, limit, ...(opts.after ? { after: opts.after } : {}) },
  });
  return {
    items: (res.data ?? []).map(mapMedia),
    nextAfter: res.paging?.next ? res.paging.cursors?.after ?? null : null,
  };
}

/** Lấy 1 media IG theo id để có URL TƯƠI ngay trước khi đăng (URL ký của IG hết hạn nhanh). */
export async function fetchIgMediaById(cfg: PageCfg, mediaId: string): Promise<IgMediaItem> {
  const raw = await graph<IgMediaRaw>(mediaId, {
    token: cfg.pageAccessToken,
    params: { fields: IG_FIELDS },
  });
  return mapMedia(raw);
}
