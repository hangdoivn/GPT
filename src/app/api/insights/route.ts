import { NextResponse } from "next/server";
import { isConnected, resolveConfig } from "@/lib/facebook/auth";
import { fetchPageInsights } from "@/lib/facebook/insights";
import { analyzeInsights } from "@/lib/insights-analysis";
import { demoInsights } from "@/lib/demo-insights";

export const dynamic = "force-dynamic";

// GET /api/insights — số liệu page + phân tích tự động
export async function GET() {
  let data = null;
  let source: "facebook" | "demo" = "demo";
  let note: string | null = null;

  if (await isConnected()) {
    try {
      const cfg = await resolveConfig();
      const fetched = await fetchPageInsights(cfg);
      if (fetched.series.length > 0) {
        data = fetched;
        source = "facebook";
      } else {
        // Kết nối OK nhưng thiếu quyền read_insights -> chart trống. Dùng số minh hoạ + báo rõ.
        note =
          "Đã kết nối nhưng chưa cấp quyền read_insights (Facebook giới hạn với loại app hiện tại) — biểu đồ dưới là SỐ MINH HOẠ. Trang Đánh giá tệp không bị ảnh hưởng (dựa trên lead + ads).";
      }
    } catch (e) {
      note = `Không lấy được insight: ${e instanceof Error ? e.message : e}. Đang hiển thị dữ liệu mẫu.`;
    }
  }

  if (!data) data = demoInsights();

  const analysis = analyzeInsights(data);
  return NextResponse.json({
    source,
    note,
    fans: data.fans,
    series: data.series,
    analysis,
  });
}
