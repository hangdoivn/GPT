import { NextResponse } from "next/server";
import { isConnected, resolveConfig } from "@/lib/facebook/auth";
import { fetchPageInsights } from "@/lib/facebook/insights";
import { fetchPosts } from "@/lib/facebook/pages";
import { analyzeInsights } from "@/lib/insights-analysis";
import { analyzePosts } from "@/lib/posts-analysis";
import { demoInsights, demoPosts } from "@/lib/demo-insights";

export const dynamic = "force-dynamic";

// GET /api/insights — hiệu quả bài đăng (thật) + số liệu page (nếu có read_insights)
export async function GET() {
  const connected = await isConnected();
  const cfg = connected ? await resolveConfig() : null;

  // ── Bài đăng: dữ liệu THẬT qua pages_read_engagement (không cần read_insights) ──
  let postsRaw = null;
  let postsSource: "facebook" | "demo" = "demo";
  if (cfg) {
    try {
      const fetched = await fetchPosts(cfg);
      if (fetched.length > 0) {
        postsRaw = fetched;
        postsSource = "facebook";
      }
    } catch {
      /* thiếu quyền / page mới -> demo */
    }
  }
  if (!postsRaw) postsRaw = demoPosts();
  const posts = analyzePosts(postsRaw);

  // ── Page insights (reach/follow): cần read_insights — thường bị chặn ──
  let pageData = null;
  let pageSource: "facebook" | "demo" = "demo";
  let note: string | null = null;
  if (cfg) {
    try {
      const fetched = await fetchPageInsights(cfg);
      if (fetched.series.length > 0) {
        pageData = fetched;
        pageSource = "facebook";
      } else {
        note =
          "Biểu đồ tiếp cận/follow cần quyền read_insights (Facebook giới hạn với loại app hiện tại) — phần này là số minh hoạ. Hiệu quả BÀI ĐĂNG bên trên là số thật.";
      }
    } catch (e) {
      note = `Page insights: ${e instanceof Error ? e.message : e}.`;
    }
  }
  if (!pageData) pageData = demoInsights();
  const analysis = analyzeInsights(pageData);

  return NextResponse.json({
    // Bài đăng (thật)
    postsSource,
    posts,
    followers: pageData.fans,
    // Page insights (reach/follow) — thật nếu có read_insights, else minh hoạ
    pageSource,
    note,
    series: pageData.series,
    analysis,
  });
}
