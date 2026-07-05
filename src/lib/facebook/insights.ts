// Lấy Page Insights từ Graph API — CHỈ dùng metric còn sống (2026).
// Lưu ý deprecation của Facebook:
//   - page_impressions, page_views_total: ĐÃ GỠ 15/11/2025 -> KHÔNG dùng.
//   - page_fan_adds (non-unique): thay bằng page_daily_follows_unique.
//   - nhân khẩu follower organic: khai tử 2024, không có thay thế.
// Vì tên metric còn thay đổi theo version, hàm fetch chịu lỗi TỪNG metric
// (một metric hỏng không làm vỡ cả trang).

import { graph, type FacebookConfig } from "./client";

export interface DayPoint {
  date: string; // YYYY-MM-DD
  reach: number; // page_impressions_unique
  engagement: number; // page_post_engagements
  follows: number; // page_daily_follows_unique
  unfollows: number; // page_daily_unfollows_unique
}

export interface PageInsights {
  fans: number; // followers_count hiện tại
  series: DayPoint[];
}

type MetricKey = keyof Omit<DayPoint, "date">;

// Metric CÒN dùng được -> field trong DayPoint.
const METRICS: { metric: string; key: MetricKey }[] = [
  { metric: "page_impressions_unique", key: "reach" },
  { metric: "page_post_engagements", key: "engagement" },
  { metric: "page_daily_follows_unique", key: "follows" },
  { metric: "page_daily_unfollows_unique", key: "unfollows" },
];

interface RawInsight {
  name: string;
  values: { value: number; end_time?: string }[];
}

const emptyPoint = (date: string): DayPoint => ({ date, reach: 0, engagement: 0, follows: 0, unfollows: 0 });

/** Lấy insight `days` ngày gần nhất. Chịu lỗi từng metric để không vỡ trang. */
export async function fetchPageInsights(
  cfg: Pick<FacebookConfig, "pageId" | "pageAccessToken">,
  days = 28,
): Promise<PageInsights> {
  const until = Math.floor(Date.now() / 1000);
  const since = until - days * 86400;
  const byDate = new Map<string, DayPoint>();

  // Gọi từng metric riêng: metric bị FB gỡ sẽ ném lỗi -> bỏ qua, các metric khác vẫn chạy.
  for (const { metric, key } of METRICS) {
    try {
      const res = await graph<{ data: RawInsight[] }>(`${cfg.pageId}/insights`, {
        token: cfg.pageAccessToken,
        params: { metric, period: "day", since, until },
      });
      for (const m of res.data ?? []) {
        for (const v of m.values ?? []) {
          const date = (v.end_time ?? "").slice(0, 10);
          if (!date) continue;
          const point = byDate.get(date) ?? emptyPoint(date);
          point[key] = v.value ?? 0;
          byDate.set(date, point);
        }
      }
    } catch {
      // Metric không còn hỗ trợ ở version này -> bỏ qua an toàn.
    }
  }

  const series = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Tổng follower hiện tại — dùng followers_count (page_fans/fan_count đã lỗi thời).
  let fans = 0;
  try {
    const page = await graph<{ followers_count?: number; fan_count?: number }>(cfg.pageId, {
      token: cfg.pageAccessToken,
      params: { fields: "followers_count,fan_count" },
    });
    fans = page.followers_count ?? page.fan_count ?? 0;
  } catch {
    /* giữ 0 */
  }

  return { fans, series };
}
