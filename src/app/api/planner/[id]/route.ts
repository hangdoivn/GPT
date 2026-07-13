import { NextRequest, NextResponse } from "next/server";
import { updatePlannerPost, deletePlannerPost } from "@/lib/planner";

export const dynamic = "force-dynamic";

// PATCH /api/planner/:id — sửa nháp / chuyển sang lên lịch / đăng
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await updatePlannerPost(params.id, body));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 502 });
  }
}

// DELETE /api/planner/:id — xoá nháp / huỷ bài đã lên lịch
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await deletePlannerPost(params.id));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 502 });
  }
}
