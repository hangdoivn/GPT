import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).max(300).optional(),
  assignee: z.string().max(120).nullish(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  dueDate: z
    .string()
    .nullish()
    .transform((s) => (s && s.trim() ? s.trim() : s === null ? null : undefined))
    .refine((s) => s === null || s === undefined || !Number.isNaN(Date.parse(s)), { message: "Ngày không hợp lệ" }),
});

// PATCH /api/projects/:id/tasks/:taskId — cập nhật/đánh dấu xong đầu việc.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.assignee !== undefined) data.assignee = d.assignee;
  if (d.status !== undefined) data.status = d.status;
  if (d.dueDate !== undefined) data.dueDate = d.dueDate ? new Date(d.dueDate) : null;

  const task = await prisma.projectTask.updateMany({
    where: { id: params.taskId, projectId: params.id },
    data,
  });
  if (task.count === 0) return NextResponse.json({ error: "Không tìm thấy đầu việc" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/projects/:id/tasks/:taskId
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const res = await prisma.projectTask.deleteMany({ where: { id: params.taskId, projectId: params.id } });
  if (res.count === 0) return NextResponse.json({ error: "Không tìm thấy đầu việc" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
