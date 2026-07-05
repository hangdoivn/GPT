// Phân tích Page Insights: tính chỉ số tổng hợp, so sánh 2 nửa kỳ,
// và tự động rút ra nhận định + khuyến nghị bằng tiếng Việt.

import type { PageInsights, DayPoint } from "./facebook/insights";

export interface AnalysisMetric {
  reachTotal: number;
  reachPrev: number; // nửa kỳ trước để so sánh
  reachChangePct: number;
  impressionsTotal: number;
  engagementTotal: number;
  engagementRate: number; // % = engagement / reach
  fanAddsNet: number;
  viewsTotal: number;
  bestDay?: { date: string; reach: number };
  fans: number;
}

export type Sentiment = "good" | "warn" | "bad" | "info";

export interface Finding {
  sentiment: Sentiment;
  title: string;
  detail: string;
}

export interface InsightsAnalysis {
  metric: AnalysisMetric;
  findings: Finding[];
}

const sum = (arr: DayPoint[], k: keyof Omit<DayPoint, "date">) =>
  arr.reduce((s, d) => s + (d[k] as number), 0);

export function analyzeInsights(data: PageInsights): InsightsAnalysis {
  const series = data.series;
  const n = series.length;
  const mid = Math.floor(n / 2);
  const firstHalf = series.slice(0, mid);
  const secondHalf = series.slice(mid);

  const reachTotal = sum(secondHalf, "reach") || sum(series, "reach");
  const reachPrev = sum(firstHalf, "reach");
  const reachChangePct = reachPrev ? Math.round(((reachTotal - reachPrev) / reachPrev) * 1000) / 10 : 0;

  const impressionsTotal = sum(series, "impressions");
  const engagementTotal = sum(series, "engagement");
  const reachAll = sum(series, "reach");
  const engagementRate = reachAll ? Math.round((engagementTotal / reachAll) * 1000) / 10 : 0;
  const fanAddsNet = sum(series, "fanAdds");
  const viewsTotal = sum(series, "views");

  const bestDay = series.reduce<{ date: string; reach: number } | undefined>((best, d) => {
    if (!best || d.reach > best.reach) return { date: d.date, reach: d.reach };
    return best;
  }, undefined);

  const metric: AnalysisMetric = {
    reachTotal: reachAll,
    reachPrev,
    reachChangePct,
    impressionsTotal,
    engagementTotal,
    engagementRate,
    fanAddsNet,
    viewsTotal,
    bestDay,
    fans: data.fans,
  };

  const findings: Finding[] = [];

  // 1) Xu hướng tiếp cận (nửa sau vs nửa đầu kỳ)
  if (reachChangePct <= -20) {
    findings.push({
      sentiment: "bad",
      title: `Tiếp cận giảm mạnh ${Math.abs(reachChangePct)}%`,
      detail:
        "Nửa cuối kỳ tiếp cận thấp hơn hẳn nửa đầu. Nội dung đang mất đà — thử đăng đều hơn, làm lại các dạng bài từng hiệu quả, hoặc bài đang bị hạn chế hiển thị.",
    });
  } else if (reachChangePct < 0) {
    findings.push({
      sentiment: "warn",
      title: `Tiếp cận giảm nhẹ ${Math.abs(reachChangePct)}%`,
      detail: "Có dấu hiệu chững lại. Cân nhắc tăng tần suất đăng hoặc thử định dạng mới (reel/video ngắn).",
    });
  } else {
    findings.push({
      sentiment: "good",
      title: `Tiếp cận tăng ${reachChangePct}%`,
      detail: "Đà tiếp cận đang tốt. Duy trì nhịp đăng và nhân rộng dạng nội dung đang chạy.",
    });
  }

  // 2) Tỉ lệ tương tác
  if (engagementRate >= 10) {
    findings.push({
      sentiment: "good",
      title: `Tỉ lệ tương tác cao (${engagementRate}%)`,
      detail: "Người xem hứng thú với nội dung. Đây là lúc đẩy mạnh call-to-action (nhắn tin, đặt hàng).",
    });
  } else if (engagementRate >= 3) {
    findings.push({
      sentiment: "info",
      title: `Tỉ lệ tương tác trung bình (${engagementRate}%)`,
      detail: "Ở mức ổn. Thử thêm câu hỏi/mini-game/khuyến mãi để kéo tương tác lên.",
    });
  } else {
    findings.push({
      sentiment: "warn",
      title: `Tỉ lệ tương tác thấp (${engagementRate}%)`,
      detail: "Nội dung tiếp cận nhưng ít giữ chân. Xem lại tiêu đề/hình ảnh 3 giây đầu và độ liên quan với tệp khách.",
    });
  }

  // 3) Tăng trưởng follower
  if (fanAddsNet > 0) {
    findings.push({
      sentiment: "good",
      title: `Tăng ${fanAddsNet.toLocaleString("vi-VN")} người theo dõi`,
      detail: `Trong ${n} ngày qua. Page đang lớn dần đều.`,
    });
  } else if (fanAddsNet < 0) {
    findings.push({
      sentiment: "bad",
      title: `Mất ${Math.abs(fanAddsNet).toLocaleString("vi-VN")} người theo dõi`,
      detail: "Follower giảm ròng — kiểm tra xem có bài gây phản ứng tiêu cực hoặc chạy sai tệp không.",
    });
  }

  // 4) Ngày tốt nhất
  if (bestDay) {
    findings.push({
      sentiment: "info",
      title: `Ngày tiếp cận cao nhất: ${bestDay.date}`,
      detail: `Đạt ${bestDay.reach.toLocaleString("vi-VN")} người. Xem bài đăng hôm đó để nhân rộng công thức.`,
    });
  }

  return { metric, findings };
}
