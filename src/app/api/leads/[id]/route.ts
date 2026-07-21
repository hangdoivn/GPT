import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createProjectFromLead } from "@/lib/project-service";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  crmStatus: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
  assignee: z.string().nullish(),
  note: z.string().nullish(),
});

// PATCH /api/leads/:id — cập nhật trạng thái CRM / ghi chú.
// Khi chuyển sang "won" (chốt deal) → tự tạo Project để account triển khai.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const before = await prisma.lead.findUnique({ where: { id: params.id }, select: { crmStatus: true } });
  const updated = await prisma.lead.update({
    where: { id: params.id },
    data: parsed.data,
  });

  // Auto-tạo dự án khi lead vừa chuyển sang "won". Idempotent (không tạo trùng).
  let project = null;
  if (parsed.data.crmStatus === "won" && before?.crmStatus !== "won") {
    try {
      const res = await createProjectFromLead(params.id);
      project = res.project;
    } catch (err) {
      // Không chặn cập nhật CRM nếu tạo project lỗi, nhưng LOG lại để còn chẩn
      // đoán (nếu không sẽ mất project âm thầm: lead "won" mà không có dự án).
      console.error("[leads:won] auto-create project failed for lead", params.id, err);
    }
  }

  return NextResponse.json({ ...updated, project });
}

// DELETE /api/leads/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.lead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
