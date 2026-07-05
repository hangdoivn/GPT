import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  crmStatus: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
  assignee: z.string().nullish(),
  note: z.string().nullish(),
});

// PATCH /api/leads/:id — cập nhật trạng thái CRM / ghi chú
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await prisma.lead.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

// DELETE /api/leads/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.lead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
