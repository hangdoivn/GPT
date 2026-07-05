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
    const engagement = Math.round(reach * (0.06 + (idx % 4) * 0.008));
    const follows = Math.max(0, Math.round(11 + Math.sin(idx) * 6 + (idx % 5) - 1));
    const unfollows = Math.max(0, Math.round(2 + Math.sin(idx / 3) * 1.5 + (idx % 4 === 0 ? 1 : 0)));

    series.push({ date, reach, engagement, follows, unfollows });
  }

  return { fans: 12840, series };
}
