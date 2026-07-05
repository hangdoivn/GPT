// Phân tích Page Insights: tính chỉ số tổng hợp, so sánh 2 nửa kỳ,
// và tự động rút ra nhận định + khuyến nghị bằng tiếng Việt.

import type { PageInsights, DayPoint } from "./facebook/insights";

export interface AnalysisMetric {
  reachTotal: number;
  reachPrev: number; // nửa kỳ trước để so sánh
  reachChangePct: number;
  engagementTotal: number;
  engagementRate: number; // % = engagement / reach
  followsTotal: number;
  unfollowsTotal: number;
  fanAddsNet: number; // follows - unfollows
  churnRatio: number; // unfollows / follows
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

  const reachAll = sum(series, "reach");
  const reachTotal = sum(secondHalf, "reach") || reachAll;
  const reachPrev = sum(firstHalf, "reach");
  const reachChangePct = reachPrev ? Math.round(((reachTotal - reachPrev) / reachPrev) * 1000) / 10 : 0;

  const engagementTotal = sum(series, "engagement");
  const engagementRate = reachAll ? Math.round((engagementTotal / reachAll) * 1000) / 10 : 0;

  const followsTotal = sum(series, "follows");
  const unfollowsTotal = sum(series, "unfollows");
  const fanAddsNet = followsTotal - unfollowsTotal;
  const churnRatio = followsTotal ? Math.round((unfollowsTotal / followsTotal) * 100) / 100 : 0;

  const bestDay = series.reduce<{ date: string; reach: number } | undefined>((best, d) => {
    if (!best || d.reach > best.reach) return { date: d.date, reach: d.reach };
    return best;
  }, undefined);

  const metric: AnalysisMetric = {
    reachTotal: reachAll,
    reachPrev,
    reachChangePct,
    engagementTotal,
    engagementRate,
    followsTotal,
    unfollowsTotal,
    fanAddsNet,
    churnRatio,
    bestDay,
    fans: data.fans,
  };

  const findings: Finding[] = [];

  // 1) Xu hướng tiếp cận
  if (reachChangePct <= -20) {
    findings.push({
      sentiment: "bad",
      title: `Tiếp cận giảm mạnh ${Math.abs(reachChangePct)}%`,
      detail: "Nửa cuối kỳ tiếp cận thấp hơn hẳn. Nội dung mất đà — đăng đều hơn, làm lại dạng bài từng hiệu quả, hoặc kiểm tra bị hạn chế hiển thị.",
    });
  } else if (reachChangePct < 0) {
    findings.push({
      sentiment: "warn",
      title: `Tiếp cận giảm nhẹ ${Math.abs(reachChangePct)}%`,
      detail: "Có dấu hiệu chững lại. Cân nhắc tăng tần suất đăng hoặc thử reel/video ngắn.",
    });
  } else {
    findings.push({
      sentiment: "good",
      title: `Tiếp cận tăng ${reachChangePct}%`,
      detail: "Đà tiếp cận đang tốt. Duy trì nhịp đăng và nhân rộng dạng nội dung đang chạy.",
    });
  }

  // 2) Tỉ lệ tương tác
  if (engagementRate >= 5) {
    findings.push({ sentiment: "good", title: `Tỉ lệ tương tác cao (${engagementRate}%)`, detail: "Người xem hứng thú. Đây là lúc đẩy call-to-action (nhắn tin, đặt hàng)." });
  } else if (engagementRate >= 1) {
    findings.push({ sentiment: "info", title: `Tỉ lệ tương tác ${engagementRate}%`, detail: "Mức ổn. Thử thêm câu hỏi/mini-game/khuyến mãi để kéo tương tác lên." });
  } else {
    findings.push({ sentiment: "bad", title: `Tỉ lệ tương tác thấp (${engagementRate}%)`, detail: "Reach có nhưng gần như không ai tương tác — dấu hiệu tệp 'chai'/ghost." });
  }

  // 3) Tăng trưởng follower (ròng)
  if (fanAddsNet > 0) {
    findings.push({ sentiment: "good", title: `Tăng ${fanAddsNet.toLocaleString("vi-VN")} follower (ròng)`, detail: `Trong ${n} ngày qua (đã trừ unfollow). Page lớn dần đều.` });
  } else if (fanAddsNet < 0) {
    findings.push({ sentiment: "bad", title: `Mất ${Math.abs(fanAddsNet).toLocaleString("vi-VN")} follower (ròng)`, detail: "Unfollow nhiều hơn follow — kiểm tra bài gây phản ứng tiêu cực hoặc chạy sai tệp." });
  }

  // 4) Churn
  if (churnRatio > 0.5) {
    findings.push({ sentiment: "warn", title: `Tỉ lệ rời page cao (churn ${churnRatio})`, detail: "Fan rời nhanh sau khi follow — thường là follow ảo bị Facebook quét, hoặc tệp không đúng." });
  }

  // 5) Ngày tốt nhất
  if (bestDay && bestDay.reach > 0) {
    findings.push({ sentiment: "info", title: `Ngày tiếp cận cao nhất: ${bestDay.date}`, detail: `Đạt ${bestDay.reach.toLocaleString("vi-VN")} người. Xem bài hôm đó để nhân rộng công thức.` });
  }

  return { metric, findings };
}
