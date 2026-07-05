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
