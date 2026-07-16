import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/projects/:id/members/:mid — gỡ thành viên khỏi dự án.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; mid: string } }
) {
  const res = await prisma.projectMember.deleteMany({ where: { id: params.mid, projectId: params.id } });
  if (res.count === 0) return NextResponse.json({ error: "Không tìm thấy thành viên" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
