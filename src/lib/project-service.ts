// PRJ — lớp truy cập DB cho dự án. Tách khỏi lib/projects.ts (logic thuần) để
// file test không kéo theo Prisma.
import { prisma } from "@/lib/db";
import { formatProjectCode } from "@/lib/projects";

// ─── Nhận diện lỗi Prisma (duck-typed, không cần import namespace) ──
function prismaErrorTargets(e: unknown): string {
  const err = e as { meta?: { target?: unknown } };
  const t = err?.meta?.target;
  return Array.isArray(t) ? t.join(",") : String(t ?? "");
}
// P2002 = vi phạm ràng buộc unique.
function isUniqueOn(e: unknown, field: string): boolean {
  const err = e as { code?: string };
  return err?.code === "P2002" && prismaErrorTargets(e).includes(field);
}

// Sinh mã dự án kế tiếp dạng PRJ-000N.
// Suy từ MÃ LỚN NHẤT hiện có, KHÔNG dùng count(): count() tụt xuống khi xoá một
// dự án bất kỳ (không phải cái cao nhất) → sinh trùng mã @unique → create ném
// P2002, count() không tăng, nên MỌI lần tạo sau đều tính ra đúng mã trùng đó và
// hỏng vĩnh viễn. Lấy theo max thì xoá không kéo lùi chuỗi số.
export async function nextProjectCode(): Promise<string> {
  const rows = await prisma.project.findMany({ select: { code: true } });
  const maxSeq = rows.reduce((mx, r) => {
    const n = parseInt(r.code.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > mx ? n : mx;
  }, 0);
  return formatProjectCode(maxSeq + 1);
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
  // Nếu hai request tạo cùng lúc sinh trùng mã (race hiếm), lấy mã kế tiếp rồi
  // thử lại — thay vì ném 500 cho người dùng.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await nextProjectCode();
    try {
      return await prisma.project.create({
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
    } catch (e) {
      // Chỉ thử lại khi trùng MÃ (code). Trùng leadId thì thử lại vô ích → ném ra
      // để lớp trên (createProjectFromLead) xử lý idempotent.
      if (isUniqueOn(e, "code")) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error("Không sinh được mã dự án sau nhiều lần thử");
}

// Tạo dự án từ một lead đã "won". Idempotent: nếu lead đã có project thì trả về
// project cũ (không tạo trùng). Dùng chung cho auto-create khi CRM lên "won"
// và nút "Tạo project" thủ công.
export async function createProjectFromLead(leadId: string) {
  const existing = await prisma.project.findUnique({ where: { leadId } });
  if (existing) return { project: existing, created: false };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { project: null, created: false };

  try {
    const project = await createProject({
      name: `Dự án — ${lead.fullName}`,
      customerName: lead.fullName,
      customerPhone: lead.phone,
      leadId: lead.id,
      pageId: lead.pageId,
    });
    return { project, created: true };
  } catch (e) {
    // Race: một request khác vừa tạo project cho lead này (leadId @unique). Giữ
    // tính idempotent — trả về project đã tồn tại thay vì ném lỗi.
    if (isUniqueOn(e, "leadId")) {
      const again = await prisma.project.findUnique({ where: { leadId } });
      if (again) return { project: again, created: false };
    }
    throw e;
  }
}

// Ghi một dòng nhật ký hoạt động.
export async function logActivity(projectId: string, kind: string, message: string) {
  return prisma.projectActivity.create({ data: { projectId, kind, message } });
}
