// Lấy Page Insights từ Graph API: tiếp cận, tương tác, follow, lượt xem.
// https://developers.facebook.com/docs/graph-api/reference/page/insights

import { graph, type FacebookConfig } from "./client";

export interface DayPoint {
  date: string; // YYYY-MM-DD
  reach: number; // page_impressions_unique
  impressions: number; // page_impressions
  engagement: number; // page_post_engagements
  fanAdds: number; // page_fan_adds (net follow trong ngày)
  views: number; // page_views_total
}

export interface PageInsights {
  fans: number; // tổng follower hiện tại
  series: DayPoint[]; // theo ngày (cũ -> mới)
}

type MetricKey = keyof Omit<DayPoint, "date">;

const METRIC_MAP: Record<string, MetricKey> = {
  page_impressions_unique: "reach",
  page_impressions: "impressions",
  page_post_engagements: "engagement",
  page_fan_adds: "fanAdds",
  page_views_total: "views",
};

interface RawInsight {
  name: string;
  values: { value: number; end_time?: string }[];
}

/** Lấy insight 28 ngày gần nhất của page. */
export async function fetchPageInsights(
  cfg: Pick<FacebookConfig, "pageId" | "pageAccessToken">,
  days = 28,
): Promise<PageInsights> {
  const until = Math.floor(Date.now() / 1000);
  const since = until - days * 86400;

  const res = await graph<{ data: RawInsight[] }>(`${cfg.pageId}/insights`, {
    token: cfg.pageAccessToken,
    params: {
      metric: Object.keys(METRIC_MAP).join(","),
      period: "day",
      since,
      until,
    },
  });

  // Gộp các metric theo ngày (end_time).
  const byDate = new Map<string, DayPoint>();
  for (const metric of res.data ?? []) {
    const key = METRIC_MAP[metric.name];
    if (!key) continue;
    for (const v of metric.values ?? []) {
      const date = (v.end_time ?? "").slice(0, 10);
      if (!date) continue;
      const point =
        byDate.get(date) ??
        { date, reach: 0, impressions: 0, engagement: 0, fanAdds: 0, views: 0 };
      point[key] = v.value ?? 0;
      byDate.set(date, point);
    }
  }
  const series = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Tổng follower hiện tại.
  let fans = 0;
  try {
    const page = await graph<{ followers_count?: number; fan_count?: number }>(cfg.pageId, {
      token: cfg.pageAccessToken,
      params: { fields: "followers_count,fan_count" },
    });
    fans = page.followers_count ?? page.fan_count ?? 0;
  } catch {
    /* một số page không trả followers_count */
  }

  return { fans, series };
}
