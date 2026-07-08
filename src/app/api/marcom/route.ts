import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isConnected, resolveConfig } from "@/lib/facebook/auth";
import { fetchPageInsights } from "@/lib/facebook/insights";
import { fetchPosts } from "@/lib/facebook/pages";
import { analyzeBestTime, projectGrowth, type GrowthSeriesLite } from "@/lib/growth-analysis";
import { getGoal } from "@/lib/goals";
import { getCampaignQuality } from "@/lib/analytics";
import { getAudienceBuckets } from "@/lib/audience-buckets";
import { analyzePillars, analyzeFunnel, buildOperatingPlan } from "@/lib/marcom";
import { analyzePremiumFit, scanContentSignal } from "@/lib/premium-fit";
import { demoInsights, demoPosts } from "@/lib/demo-insights";

export const dynamic = "force-dynamic";

const num = (n?: number) => (typeof n === "number" ? n : 0);
const engOf = (p: { likes?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } }; shares?: { count?: number } }) =>
  num(p.likes?.summary?.total_count) + num(p.comments?.summary?.total_count) + num(p.shares?.count);

// GET /api/marcom — cố vấn vận hành theo mục tiêu.
export async function GET() {
  const connected = await isConnected();
  const cfg = connected ? await resolveConfig() : null;

  // ── Bài đăng thật ──
  let rawPosts = null;
  let realPosts = false;
  if (cfg) {
    try {
      const f = await fetchPosts(cfg);
      if (f.length > 0) { rawPosts = f; realPosts = true; }
    } catch { /* demo */ }
  }
  if (!rawPosts) rawPosts = demoPosts();

  const pillars = analyzePillars(
    realPosts ? rawPosts.map((p) => ({ message: p.message ?? "", engagement: engOf(p) })) : [],
  );
  const bestTime = realPosts ? analyzeBestTime(rawPosts) : { hasData: false, byWeekday: [], byHour: [], findings: [] };

  // ── Insights thật (reach/follow) ──
  let pageData = null;
  let realInsights = false;
  if (cfg) {
    try {
      const f = await fetchPageInsights(cfg);
      if (f.series.length > 0) { pageData = f; realInsights = true; }
    } catch { /* demo */ }
  }
  if (!pageData) pageData = demoInsights();

  const days = pageData.series.length || 28;
  const weeks = days / 7;
  const netFollows = pageData.series.reduce((s, d) => s + (d.follows - d.unfollows), 0);
  const reachTotal = pageData.series.reduce((s, d) => s + d.reach, 0);
  const realPostCount = realPosts ? rawPosts.length : 0;
  const engagementTotal = realPosts ? rawPosts.reduce((s, p) => s + engOf(p), 0) : 0;

  const seriesLite: GrowthSeriesLite = { days, netFollows, reachTotal, posts: realPostCount };

  // ── Mục tiêu + dự phóng ──
  const goal = await getGoal();
  const projection = projectGrowth(
    goal
      ? {
          targetFollowers: goal.targetFollowers,
          targetReachPerWeek: goal.targetReachPerWeek,
          targetPostsPerWeek: goal.targetPostsPerWeek,
          deadline: goal.deadline ? goal.deadline.toISOString() : null,
          baselineFollowers: goal.baselineFollowers,
          baselineAt: goal.baselineAt ? goal.baselineAt.toISOString() : null,
        }
      : null,
    pageData.fans,
    seriesLite,
    Date.now(),
    realInsights,
  );

  // ── Lead/phễu ──
  const [totalLeads, qualified, won, newUncontacted] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { quality: { in: ["good", "warm"] } } }),
    prisma.lead.count({ where: { crmStatus: "won" } }),
    prisma.lead.count({ where: { crmStatus: "new" } }),
  ]);

  const funnel = analyzeFunnel({
    reachPerWeek: realInsights ? Math.round(reachTotal / weeks) : null,
    engagementPerWeek: realPosts ? Math.round(engagementTotal / weeks) : null,
    leads: totalLeads,
    qualified,
    won,
  });

  // ── Đơn giá theo campaign (unit economics) ──
  const campaignQuality = await getCampaignQuality();
  const junkCampaigns = campaignQuality.map((c) => ({ name: c.name, junkRate: c.junkRate }));
  const unitEconomics = [];
  for (const c of campaignQuality) {
    const good = await prisma.lead.count({ where: { campaignId: c.id, quality: { in: ["good", "warm"] } } });
    const cwon = await prisma.lead.count({ where: { campaignId: c.id, crmStatus: "won" } });
    unitEconomics.push({
      name: c.name,
      spend: c.spend,
      leads: c.total,
      qualified: good,
      won: cwon,
      cpl: c.total ? Math.round(c.spend / c.total) : 0,
      cpql: good ? Math.round(c.spend / good) : 0,
      cpw: cwon ? Math.round(c.spend / cwon) : 0,
      junkRate: c.junkRate,
    });
  }
  unitEconomics.sort((a, b) => b.spend - a.spend);

  // ── Đánh giá phù hợp tệp cao cấp (ICP >25tr/tháng) ──
  const buckets = await getAudienceBuckets();
  const coreJunk = buckets.filter((b) => b.bucket === "core");
  const broad = buckets.find((b) => b.bucket === "broad");
  const l2q = funnel.conversions.find((c) => c.to === "qualified");
  const q2w = funnel.conversions.find((c) => c.to === "won");
  const icpMinVnd = goal?.icpMonthlyMinVnd ?? 25_000_000;
  const premiumFit = analyzePremiumFit({
    icpMinVnd,
    icpNote: goal?.icpNote ?? goal?.audienceNote ?? null,
    pillars,
    signal: realPosts ? scanContentSignal(rawPosts.map((p) => p.message ?? "")) : { discountDensity: 0, premiumDensity: 0 },
    coreJunkRate: coreJunk.length ? Math.min(...coreJunk.map((b) => b.junkRate)) : null,
    broadJunkRate: broad ? broad.junkRate : null,
    leadToQualified: l2q ? l2q.rate : null,
    qualifiedToWon: q2w ? q2w.rate : null,
    hasData: (realPosts && pillars.pillars.length > 0) || totalLeads > 0,
  });

  // ── Kế hoạch vận hành ──
  const plan = buildOperatingPlan({
    goal: goal
      ? { targetFollowers: goal.targetFollowers, targetReachPerWeek: goal.targetReachPerWeek, targetPostsPerWeek: goal.targetPostsPerWeek, audienceNote: goal.audienceNote }
      : null,
    dataReal: realInsights,
    followPerWeek: projection.followPerWeek,
    reachPerWeek: projection.reachPerWeek,
    postsPerWeek: projection.postsPerWeek,
    weeksToDeadline: projection.weeksToDeadline ?? null,
    neededFollowPerWeek: projection.neededFollowPerWeek ?? null,
    onTrackFollowers: projection.onTrackFollowers ?? null,
    pillars,
    bestWeekdayLabel: bestTime.hasData ? bestTime.bestWeekday?.label : undefined,
    goldenHour: bestTime.hasData ? bestTime.bestHourWindow : undefined,
    funnelWeakest: funnel.weakest ? { to: funnel.weakest.to, rate: funnel.weakest.rate } : null,
    junkCampaigns,
    newLeadsUncontacted: newUncontacted,
  });

  return NextResponse.json({
    connected,
    real: { insights: realInsights, posts: realPosts },
    goal: goal
      ? { targetFollowers: goal.targetFollowers, targetReachPerWeek: goal.targetReachPerWeek, deadline: goal.deadline ? goal.deadline.toISOString().slice(0, 10) : null, audienceNote: goal.audienceNote, icpMonthlyMinVnd: goal.icpMonthlyMinVnd, icpNote: goal.icpNote }
      : null,
    icpMinVnd,
    premiumFit,
    plan,
    pillars,
    funnel,
    unitEconomics,
  });
}
