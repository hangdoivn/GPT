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
  let postsNote: string | null = null;
  if (!connected) {
    postsNote = "Chưa kết nối Facebook — vào Cài đặt để đăng nhập.";
  } else if (cfg) {
    try {
      const fetched = await fetchPosts(cfg);
      if (fetched.length > 0) {
        postsRaw = fetched;
        postsSource = "facebook";
      } else {
        postsNote = `Đã kết nối page "${cfg.pageId}" nhưng KHÔNG đọc được bài đăng nào. Kiểm tra: đã chọn đúng page (có nội dung) trong Cài đặt chưa? Đang hiển thị số minh hoạ.`;
      }
    } catch (e) {
      postsNote = `Đã kết nối nhưng đọc bài đăng lỗi: ${e instanceof Error ? e.message : e}. Đang hiển thị số minh hoạ.`;
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
          "Biểu đồ tiếp cận/follow cần quyền read_insights (Facebook giới hạn với loại app hiện tại) — phần này là số minh hoạ.";
      }
    } catch (e) {
      note = `Page insights: ${e instanceof Error ? e.message : e}.`;
    }
  }
  if (!pageData) pageData = demoInsights();
  const analysis = analyzeInsights(pageData);

  return NextResponse.json({
    connected,
    activePageId: cfg?.pageId ?? null,
    postsSource,
    postsNote,
    posts,
    followers: pageData.fans,
    pageSource,
    note,
    series: pageData.series,
    analysis,
  });
}
