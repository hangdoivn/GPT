import { NextRequest, NextResponse } from "next/server";
import { isConnected } from "@/lib/facebook/auth";
import { listPlannerPosts, createPlannerPost } from "@/lib/planner";

export const dynamic = "force-dynamic";

// GET /api/planner?from=&to= — bài trong khoảng (cho lưới lịch)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const posts = await listPlannerPosts(sp.get("from") ?? undefined, sp.get("to") ?? undefined);
    return NextResponse.json(posts);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 500 });
  }
}

// POST /api/planner — tạo nháp / lên lịch / đăng ngay
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  if ((body.publishNow || body.scheduledAt) && !(await isConnected())) {
    return NextResponse.json({ error: "Chưa kết nối Facebook." }, { status: 400 });
  }
  try {
    const post = await createPlannerPost(body);
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 502 });
  }
}
