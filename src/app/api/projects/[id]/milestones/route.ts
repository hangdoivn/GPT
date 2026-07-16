import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/project-service";
import { fmtVnd } from "@/lib/format";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().int().min(0),
  dueDate: z
    .string()
    .nullish()
    .transform((s) => (s && s.trim() ? s.trim() : null))
    .refine((s) => s === null || !Number.isNaN(Date.parse(s)), { message: "Ngày không hợp lệ" }),
});

// POST /api/projects/:id/milestones — thêm mốc thanh toán.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });

  const last = await prisma.projectMilestone.findFirst({
    where: { projectId: params.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const m = await prisma.projectMilestone.create({
    data: {
      projectId: params.id,
      title: parsed.data.title,
      amount: parsed.data.amount,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      order: (last?.order ?? 0) + 1,
    },
  });
  await logActivity(params.id, "payment", `Thêm mốc thanh toán: ${m.title} (${fmtVnd(m.amount)}).`);
  return NextResponse.json(m, { status: 201 });
}
