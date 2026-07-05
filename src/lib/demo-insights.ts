// Insight mẫu mô phỏng page Hàng Đôi (28 ngày) — dùng để test & khi chưa kết nối.
import type { PageInsights } from "./facebook/insights";

export function demoInsights(days = 28): PageInsights {
  const today = new Date();
  const series: PageInsights["series"] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const idx = days - 1 - i; // 0..days-1 (cũ -> mới)

    const wave = Math.sin(idx / 2) * 850;
    const trend = idx < days / 2 ? 4300 : 3500; // nửa sau tiếp cận thấp hơn
    const reach = Math.max(800, Math.round(trend + wave + (idx % 3) * 180));
    const impressions = Math.round(reach * 1.6);
    const engagement = Math.round(reach * (0.06 + (idx % 4) * 0.008));
    const fanAdds = Math.round(9 + Math.sin(idx) * 6 + (idx % 5) - 1);
    const views = Math.round(reach * 0.05);

    series.push({ date, reach, impressions, engagement, fanAdds, views });
  }

  return { fans: 12840, series };
}
