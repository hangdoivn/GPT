// Quản lý fanpage & bài đăng qua Graph API.

import { getConfig, graph, graphAll } from "./client";

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
export async function fetchPage(pageId?: string): Promise<FbPage> {
  const cfg = getConfig();
  return graph<FbPage>(pageId ?? cfg.pageId, {
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
export async function fetchPosts(pageId?: string): Promise<FbPost[]> {
  const cfg = getConfig();
  return graphAll<FbPost>(`${pageId ?? cfg.pageId}/posts`, {
    params: {
      fields:
        "id,message,created_time,likes.summary(true),comments.summary(true),shares",
    },
  });
}

/** Đăng bài mới (hoặc lên lịch nếu truyền scheduledUnix). */
export async function publishPost(
  message: string,
  scheduledUnix?: number,
  pageId?: string,
): Promise<{ id: string }> {
  const cfg = getConfig();
  const body: Record<string, unknown> = { message };
  if (scheduledUnix) {
    body.published = false;
    body.scheduled_publish_time = scheduledUnix;
  }
  return graph<{ id: string }>(`${pageId ?? cfg.pageId}/feed`, {
    method: "POST",
    body,
  });
}
