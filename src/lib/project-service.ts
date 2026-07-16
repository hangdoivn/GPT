// PRJ — lớp truy cập DB cho dự án. Tách khỏi lib/projects.ts (logic thuần) để
// file test không kéo theo Prisma.
import { prisma } from "@/lib/db";
import { formatProjectCode } from "@/lib/projects";

// Sinh mã dự án kế tiếp dạng PRJ-000N. Quy mô app nhỏ nên đếm bản ghi là đủ;
// nếu trùng (race hiếm) sẽ ném lỗi unique và người dùng thử lại.
export async function nextProjectCode(): Promise<string> {
  const count = await prisma.project.count();
  return formatProjectCode(count + 1);
}

export interface CreateProjectInput {
  name: string;
  customerName: string;
  customerPhone?: string | null;
  description?: string | null;
  leadId?: string | null;
  pageId?: string | null;
  contractValue?: number;
  deadline?: Date | null;
  priority?: string;
}

export async function createProject(input: CreateProjectInput) {
  const code = await nextProjectCode();
  return prisma.project.create({
    data: {
      code,
      name: input.name,
      customerName: input.customerName,
      customerPhone: input.customerPhone ?? null,
      description: input.description ?? null,
      leadId: input.leadId ?? null,
      pageId: input.pageId ?? null,
      contractValue: input.contractValue ?? 0,
      deadline: input.deadline ?? null,
      priority: input.priority ?? "normal",
      startDate: new Date(),
      activities: {
        create: { kind: "system", message: `Tạo dự án ${code}${input.leadId ? " từ lead chốt deal" : ""}.` },
      },
    },
  });
}

// Tạo dự án từ một lead đã "won". Idempotent: nếu lead đã có project thì trả về
// project cũ (không tạo trùng). Dùng chung cho auto-create khi CRM lên "won"
// và nút "Tạo project" thủ công.
export async function createProjectFromLead(leadId: string) {
  const existing = await prisma.project.findUnique({ where: { leadId } });
  if (existing) return { project: existing, created: false };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { project: null, created: false };

  const project = await createProject({
    name: `Dự án — ${lead.fullName}`,
    customerName: lead.fullName,
    customerPhone: lead.phone,
    leadId: lead.id,
    pageId: lead.pageId,
  });
  return { project, created: true };
}

// Ghi một dòng nhật ký hoạt động.
export async function logActivity(projectId: string, kind: string, message: string) {
  return prisma.projectActivity.create({ data: { projectId, kind, message } });
}
