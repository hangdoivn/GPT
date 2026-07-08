// Đọc/ghi mục tiêu xây page (singleton).
import { prisma } from "./db";

export interface GoalData {
  targetFollowers?: number | null;
  targetReachPerWeek?: number | null;
  targetPostsPerWeek?: number | null;
  deadline?: string | null; // ISO
  audienceNote?: string | null;
  icpMonthlyMinVnd?: number | null; // ngưỡng doanh thu tệp cao cấp (VND/tháng)
  icpNote?: string | null; // mô tả tệp cao cấp
}

export async function getGoal() {
  return prisma.goal.findUnique({ where: { id: "singleton" } });
}

/**
 * Lưu mục tiêu (merge từng phần: chỉ ghi field được TRUYỀN, undefined thì giữ
 * nguyên — để form Mục tiêu và form ICP không xoá dữ liệu của nhau).
 * Ghi baseline follower lần đầu có số thật (để đo tiến độ).
 */
export async function saveGoal(data: GoalData, currentFollowers: number) {
  const existing = await prisma.goal.findUnique({ where: { id: "singleton" } });

  // Chỉ đưa vào update các key có mặt trong `data` (không undefined).
  const patch: Record<string, unknown> = {};
  const set = <K extends keyof GoalData>(k: K, v: unknown) => {
    if (data[k] !== undefined) patch[k] = v;
  };
  set("targetFollowers", data.targetFollowers ?? null);
  set("targetReachPerWeek", data.targetReachPerWeek ?? null);
  set("targetPostsPerWeek", data.targetPostsPerWeek ?? null);
  set("deadline", data.deadline ? new Date(data.deadline) : null);
  set("audienceNote", data.audienceNote ?? null);
  set("icpMonthlyMinVnd", data.icpMonthlyMinVnd ?? null);
  set("icpNote", data.icpNote ?? null);

  // Chỉ ghi baseline khi có số follower THẬT (>0). Tránh khoá baseline vào 0.
  const haveReal = currentFollowers > 0;

  if (!existing) {
    return prisma.goal.create({
      data: {
        id: "singleton",
        ...patch,
        baselineFollowers: haveReal ? currentFollowers : null,
        baselineAt: haveReal ? new Date() : null,
      },
    });
  }
  const needBaseline = existing.baselineFollowers == null || existing.baselineFollowers === 0;
  return prisma.goal.update({
    where: { id: "singleton" },
    data: {
      ...patch,
      ...(needBaseline && haveReal ? { baselineFollowers: currentFollowers, baselineAt: new Date() } : {}),
    },
  });
}
