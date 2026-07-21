import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createProject, createProjectFromLead } from "@/lib/project-service";
import {
  taskProgress,
  taskCounts,
  paymentSummary,
  isOverdue,
  daysLeft,
  summarizeProjects,
  PRIORITIES,
} from "@/lib/projects";

export const dynamic = "force-dynamic";

// GET /api/projects — danh sách dự án kèm số liệu suy ra + tổng hợp.
export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tasks: { select: { status: true } },
      milestones: { select: { amount: true, paid: true } },
      _count: { select: { members: true } },
    },
  });

  const now = new Date();
  const rows = projects.map((p) => {
    const pay = paymentSummary(p.contractValue, p.milestones);
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      customerName: p.customerName,
      customerPhone: p.customerPhone,
      stage: p.stage,
      priority: p.priority,
      deadline: p.deadline,
      contractValue: p.contractValue,
      leadId: p.leadId,
      progress: taskProgress(p.tasks),
      tasks: taskCounts(p.tasks),
      memberCount: p._count.members,
      payment: { paid: pay.paid, remaining: pay.remaining, paidPct: pay.paidPct, contractValue: pay.contractValue },
      overdue: isOverdue(p.deadline, p.stage, now),
      daysLeft: daysLeft(p.deadline, now),
    };
  });

  const summary = summarizeProjects(
    projects.map((p) => ({
      stage: p.stage,
      deadline: p.deadline,
      contractValue: p.contractValue,
      milestones: p.milestones,
    })),
    now
  );

  return NextResponse.json({ projects: rows, summary });
}

const createSchema = z
  .object({
    // Cách 1: tạo từ lead đã chốt deal
    fromLeadId: z.string().min(1).optional(),
    // Cách 2: tạo thủ công
    name: z.string().min(1).max(200).optional(),
    customerName: z.string().min(1).max(200).optional(),
    customerPhone: z.string().max(50).nullish(),
    description: z.string().max(2000).nullish(),
    // Tiền VND lưu ở cột INTEGER (Postgres INT4, tối đa 2_147_483_647 ≈ 2,14 tỷ).
    // Vượt ngưỡng sẽ tràn cột → chặn ở đây trả 400 thay vì để DB ném 500.
    contractValue: z.number().int().min(0).max(2_147_483_647).optional(),
    priority: z.enum(PRIORITIES).optional(),
    deadline: z
      .string()
      .nullish()
      .transform((s) => (s && s.trim() ? s.trim() : null))
      .refine((s) => s === null || s === undefined || !Number.isNaN(Date.parse(s)), { message: "Ngày không hợp lệ" }),
  })
  .refine((d) => d.fromLeadId || (d.name && d.customerName), {
    message: "Cần fromLeadId, hoặc name + customerName",
  });

// POST /api/projects — tạo dự án (từ lead chốt deal hoặc thủ công).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  try {
    if (d.fromLeadId) {
      const { project, created } = await createProjectFromLead(d.fromLeadId);
      if (!project) return NextResponse.json({ error: "Không tìm thấy lead" }, { status: 404 });
      return NextResponse.json({ project, created }, { status: created ? 201 : 200 });
    }

    const project = await createProject({
      name: d.name!,
      customerName: d.customerName!,
      customerPhone: d.customerPhone ?? null,
      description: d.description ?? null,
      contractValue: d.contractValue ?? 0,
      priority: d.priority ?? "normal",
      deadline: d.deadline ? new Date(d.deadline) : null,
    });
    return NextResponse.json({ project, created: true }, { status: 201 });
  } catch (e) {
    // Trùng ràng buộc unique (mã dự án khi tạo đồng thời, hoặc lead đã có dự án).
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Trùng dữ liệu (mã dự án hoặc lead đã có dự án)" }, { status: 409 });
    }
    throw e;
  }
}
