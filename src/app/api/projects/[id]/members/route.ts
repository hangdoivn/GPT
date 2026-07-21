import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/project-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().max(80).nullish(),
});

// POST /api/projects/:id/members — giao thêm thành viên.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });

  // Trùng tên trong cùng dự án → báo lỗi gọn thay vì 500.
  const dup = await prisma.projectMember.findFirst({
    where: { projectId: params.id, name: parsed.data.name },
    select: { id: true },
  });
  if (dup) return NextResponse.json({ error: "Thành viên đã có trong dự án" }, { status: 409 });

  let member;
  try {
    member = await prisma.projectMember.create({
      data: { projectId: params.id, name: parsed.data.name, role: parsed.data.role ?? null },
    });
  } catch (e) {
    // Race double-click: qua được findFirst nhưng dính @@unique([projectId,name]).
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Thành viên đã có trong dự án" }, { status: 409 });
    }
    throw e;
  }
  await logActivity(params.id, "note", `Giao việc cho ${member.name}${member.role ? ` (${member.role})` : ""}.`);
  return NextResponse.json(member, { status: 201 });
}
