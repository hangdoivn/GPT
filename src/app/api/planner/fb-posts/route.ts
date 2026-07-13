import { NextRequest, NextResponse } from "next/server";
import { isConnected } from "@/lib/facebook/auth";
import { listFbAssets } from "@/lib/planner";

export const dynamic = "force-dynamic";

// GET /api/planner/fb-posts?pageFbId= — bài FB cũ (có ảnh) để chọn làm asset
export async function GET(req: NextRequest) {
  if (!(await isConnected())) {
    return NextResponse.json({ error: "Chưa kết nối Facebook." }, { status: 400 });
  }
  const pageFbId = req.nextUrl.searchParams.get("pageFbId") ?? "";
  if (!pageFbId) return NextResponse.json({ error: "Thiếu pageFbId." }, { status: 400 });
  try {
    return NextResponse.json(await listFbAssets(pageFbId));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 502 });
  }
}
