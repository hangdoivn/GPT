import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/project-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).max(300),
  assignee: z.string().max(120).nullish(),
  dueDate: z
    .string()
    .nullish()
    .transform((s) => (s && s.trim() ? s.trim() : null))
    .refine((s) => s === null || !Number.isNaN(Date.parse(s)), { message: "Ngày không hợp lệ" }),
});

// POST /api/projects/:id/tasks — thêm đầu việc.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });

  const last = await prisma.projectTask.findFirst({
    where: { projectId: params.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await prisma.projectTask.create({
    data: {
      projectId: params.id,
      title: parsed.data.title,
      assignee: parsed.data.assignee ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      order: (last?.order ?? 0) + 1,
    },
  });
  await logActivity(params.id, "task", `Thêm việc: ${task.title}.`);
  return NextResponse.json(task, { status: 201 });
}
