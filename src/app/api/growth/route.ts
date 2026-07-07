import { NextResponse } from "next/server";
import { isConnected, resolveConfig } from "@/lib/facebook/auth";
import { fetchPageInsights } from "@/lib/facebook/insights";
import { fetchPosts } from "@/lib/facebook/pages";
import { fetchAudienceDemographics, type AudienceDemographics } from "@/lib/facebook/audience";
import { analyzeBestTime, projectGrowth, type GrowthSeriesLite } from "@/lib/growth-analysis";
import { getGoal } from "@/lib/goals";
import { demoInsights, demoPosts } from "@/lib/demo-insights";

export const dynamic = "force-dynamic";

// GET /api/growth — dữ liệu cho trang "Mục tiêu & Tăng trưởng".
export async function GET() {
  const connected = await isConnected();
  const cfg = connected ? await resolveConfig() : null;

  // Bài đăng thật (cho thời điểm đăng tốt nhất).
  let rawPosts = null;
  let postsSource: "facebook" | "demo" = "demo";
  if (cfg) {
    try {
      const fetched = await fetchPosts(cfg);
      if (fetched.length > 0) {
        rawPosts = fetched;
        postsSource = "facebook";
      }
    } catch {
      /* thiếu quyền -> demo */
    }
  }
  if (!rawPosts) rawPosts = demoPosts();
  const realPosts = postsSource === "facebook";
  // Chỉ phân tích thời điểm đăng từ bài THẬT — không bịa từ bài demo.
  const bestTime = realPosts
    ? analyzeBestTime(rawPosts)
    : {
        hasData: false,
        byWeekday: [],
        byHour: [],
        findings: [
          {
            sentiment: "info" as const,
            title: "Chưa có bài đăng thật",
            detail: "Kết nối Facebook + bấm “Làm mới token trang” để phân tích thời điểm đăng tốt nhất từ bài thật.",
          },
        ],
      };

  // Page insights (reach/follow) — cần read_insights.
  let pageData = null;
  let pageSource: "facebook" | "demo" = "demo";
  if (cfg) {
    try {
      const fetched = await fetchPageInsights(cfg);
      if (fetched.series.length > 0) {
        pageData = fetched;
        pageSource = "facebook";
      }
    } catch {
      /* demo */
    }
  }
  if (!pageData) pageData = demoInsights();
  const realInsights = pageSource === "facebook";

  const netFollows = pageData.series.reduce((s, d) => s + (d.follows - d.unfollows), 0);
  const reachTotal = pageData.series.reduce((s, d) => s + d.reach, 0);
  // Nhịp đăng dùng số bài THẬT trên khung THẬT; nếu thiếu -> 0 (không trộn demo).
  const realPostCount = realPosts ? bestTime.byWeekday.reduce((s, w) => s + w.posts, 0) : 0;
  const seriesLite: GrowthSeriesLite = {
    days: pageData.series.length || 28,
    netFollows,
    reachTotal,
    posts: realPostCount,
  };

  // Nhân khẩu người xem (từ ads breakdown).
  let demographics: AudienceDemographics = { available: false, ageGender: [], region: [], totalReach: 0 };
  if (cfg) {
    try {
      demographics = await fetchAudienceDemographics(cfg);
    } catch {
      /* bỏ qua */
    }
  }

  // Mục tiêu + dự phóng.
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
    realInsights, // dataReal: chỉ dự phóng khi có số liệu thật
  );

  return NextResponse.json({
    connected,
    postsSource,
    pageSource,
    real: { insights: realInsights, posts: realPosts },
    followers: realInsights ? pageData.fans : null,
    series: pageData.series,
    bestTime,
    demographics,
    projection,
    goal: goal
      ? {
          targetFollowers: goal.targetFollowers,
          targetReachPerWeek: goal.targetReachPerWeek,
          targetPostsPerWeek: goal.targetPostsPerWeek,
          deadline: goal.deadline ? goal.deadline.toISOString().slice(0, 10) : null,
          audienceNote: goal.audienceNote,
        }
      : null,
  });
}
