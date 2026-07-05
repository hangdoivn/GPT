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
      data = await fetchPageInsights(cfg);
      source = "facebook";
    } catch (e) {
      // Token có thể thiếu quyền read_insights, hoặc page mới chưa đủ dữ liệu.
      note = `Không lấy được insight thật: ${e instanceof Error ? e.message : e}. Đang hiển thị dữ liệu mẫu.`;
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
