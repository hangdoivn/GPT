import { NextResponse } from "next/server";
import { isConnected, resolveConfig } from "@/lib/facebook/auth";
import { fetchPageInsights } from "@/lib/facebook/insights";
import { analyzeInsights } from "@/lib/insights-analysis";
import { demoInsights } from "@/lib/demo-insights";
import { getOverview } from "@/lib/analytics";
import { getAudienceBuckets } from "@/lib/audience-buckets";
import { evaluateAudience, type AudienceInput } from "@/lib/audience-eval";

export const dynamic = "force-dynamic";

// GET /api/audience — đánh giá tệp người xem + phán quyết giữ/sửa ads/detox/page mới
export async function GET() {
  let source: "facebook" | "demo" = "demo";
  let note: string | null = null;

  // Insight page (real nếu đã kết nối, else demo)
  let insights = null;
  if (await isConnected()) {
    try {
      const cfg = await resolveConfig();
      insights = await fetchPageInsights(cfg);
      source = "facebook";
    } catch (e) {
      note = `Không lấy được insight thật: ${e instanceof Error ? e.message : e}. Đang dùng dữ liệu mẫu cho phần tệp organic.`;
    }
  }
  if (!insights) insights = demoInsights();

  const analysis = analyzeInsights(insights);
  const [overview, buckets] = await Promise.all([getOverview(), getAudienceBuckets()]);

  const input: AudienceInput = {
    junkRate: overview.junkRate,
    buckets,
    engagementRate: analysis.metric.engagementRate,
    reachTrendPct: analysis.metric.reachChangePct,
    fanAddsNet: analysis.metric.fanAddsNet,
    churnRatio: analysis.metric.churnRatio,
    followers: insights.fans,
    // Nhân khẩu / relevance ranking / foreign reach: cần Ads Insights — mở khi đã kết nối ads.
    // (v1 để trống -> engine tính trung tính và nhắc kết nối)
  };

  const evaluation = evaluateAudience(input);

  return NextResponse.json({
    source,
    note,
    followers: insights.fans,
    overview,
    buckets,
    evaluation,
  });
}
