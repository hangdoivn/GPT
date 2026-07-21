import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/project-service";
import { fmtVnd } from "@/lib/format";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  amount: z.number().int().min(0).max(2_147_483_647).optional(), // giới hạn INT4 (VND)
  paid: z.boolean().optional(),
  dueDate: z
    .string()
    .nullish()
    .transform((s) => (s && s.trim() ? s.trim() : s === null ? null : undefined))
    .refine((s) => s === null || s === undefined || !Number.isNaN(Date.parse(s)), { message: "Ngày không hợp lệ" }),
});

// PATCH /api/projects/:id/milestones/:mid — sửa / đánh dấu đã thu.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; mid: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const current = await prisma.projectMilestone.findFirst({ where: { id: params.mid, projectId: params.id } });
  if (!current) return NextResponse.json({ error: "Không tìm thấy mốc" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.amount !== undefined) data.amount = d.amount;
  if (d.dueDate !== undefined) data.dueDate = d.dueDate ? new Date(d.dueDate) : null;
  if (d.paid !== undefined) {
    data.paid = d.paid;
    data.paidAt = d.paid ? new Date() : null;
  }

  let m;
  try {
    m = await prisma.projectMilestone.update({ where: { id: params.mid }, data });
  } catch (e) {
    // Mốc bị xoá xen giữa lúc kiểm tra và cập nhật (P2025) → 404 thay vì 500.
    if ((e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Không tìm thấy mốc" }, { status: 404 });
    }
    throw e;
  }

  if (d.paid !== undefined && d.paid !== current.paid) {
    await logActivity(
      params.id,
      "payment",
      d.paid ? `Đã thu: ${m.title} (${fmtVnd(m.amount)}).` : `Bỏ đánh dấu đã thu: ${m.title}.`
    );
  }
  return NextResponse.json(m);
}

// DELETE /api/projects/:id/milestones/:mid
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; mid: string } }
) {
  const res = await prisma.projectMilestone.deleteMany({ where: { id: params.mid, projectId: params.id } });
  if (res.count === 0) return NextResponse.json({ error: "Không tìm thấy mốc" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
