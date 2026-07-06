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
  let insightsReal = false;

  // Kết nối rồi -> lead/ads/follower là thật; page-insights cần quyền read_insights.
  let insights = null;
  if (await isConnected()) {
    source = "facebook";
    try {
      const cfg = await resolveConfig();
      const fetched = await fetchPageInsights(cfg);
      insights = fetched;
      if (fetched.series.length > 0) insightsReal = true;
      else
        note =
          "Đã kết nối nhưng chưa cấp quyền read_insights — chỉ số organic (reach/tương tác/follow) tạm ẩn. Phán quyết dựa trên lead + ads (2 trụ organic tính trung tính, không phạt).";
    } catch (e) {
      note = `Không lấy được insight: ${e instanceof Error ? e.message : e}.`;
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
    insightsAvailable: insightsReal,
    // Nhân khẩu / relevance ranking / foreign reach: cần Ads Insights — mở khi đã kết nối ads.
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
