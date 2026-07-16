import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/project-service";
import {
  taskProgress,
  taskCounts,
  paymentSummary,
  isOverdue,
  daysLeft,
  stageLabel,
  STAGE_KEYS,
  PRIORITIES,
} from "@/lib/projects";

export const dynamic = "force-dynamic";

// GET /api/projects/:id — chi tiết đầy đủ.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const p = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      tasks: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      milestones: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      members: { orderBy: { createdAt: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!p) return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });

  const now = new Date();
  const pay = paymentSummary(p.contractValue, p.milestones);
  return NextResponse.json({
    ...p,
    progress: taskProgress(p.tasks),
    taskCounts: taskCounts(p.tasks),
    payment: pay,
    overdue: isOverdue(p.deadline, p.stage, now),
    daysLeft: daysLeft(p.deadline, now),
  });
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  customerName: z.string().min(1).max(200).optional(),
  customerPhone: z.string().max(50).nullish(),
  stage: z.enum(STAGE_KEYS as [string, ...string[]]).optional(),
  priority: z.enum(PRIORITIES).optional(),
  contractValue: z.number().int().min(0).optional(),
  deadline: z
    .string()
    .nullish()
    .transform((s) => (s && s.trim() ? s.trim() : s === null ? null : undefined))
    .refine((s) => s === null || s === undefined || !Number.isNaN(Date.parse(s)), { message: "Ngày không hợp lệ" }),
});

// PATCH /api/projects/:id — cập nhật thông tin / chuyển giai đoạn.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const before = await prisma.project.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.description !== undefined) data.description = d.description;
  if (d.customerName !== undefined) data.customerName = d.customerName;
  if (d.customerPhone !== undefined) data.customerPhone = d.customerPhone;
  if (d.stage !== undefined) data.stage = d.stage;
  if (d.priority !== undefined) data.priority = d.priority;
  if (d.contractValue !== undefined) data.contractValue = d.contractValue;
  if (d.deadline !== undefined) data.deadline = d.deadline ? new Date(d.deadline) : null;

  const updated = await prisma.project.update({ where: { id: params.id }, data });

  // Ghi nhật ký khi đổi giai đoạn.
  if (d.stage !== undefined && d.stage !== before.stage) {
    await logActivity(params.id, "stage", `Chuyển giai đoạn: ${stageLabel(before.stage)} → ${stageLabel(d.stage)}.`);
  }

  return NextResponse.json(updated);
}

// DELETE /api/projects/:id — xoá dự án (cascade tasks/milestones/members/log).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
