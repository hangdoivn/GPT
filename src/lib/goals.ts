// Đọc/ghi mục tiêu xây page (singleton).
import { prisma } from "./db";

export interface GoalData {
  targetFollowers?: number | null;
  targetReachPerWeek?: number | null;
  targetPostsPerWeek?: number | null;
  deadline?: string | null; // ISO
  audienceNote?: string | null;
}

export async function getGoal() {
  return prisma.goal.findUnique({ where: { id: "singleton" } });
}

/** Lưu mục tiêu. Ghi baseline follower lần đầu đặt (để đo tiến độ). */
export async function saveGoal(data: GoalData, currentFollowers: number) {
  const existing = await prisma.goal.findUnique({ where: { id: "singleton" } });
  const deadline = data.deadline ? new Date(data.deadline) : null;

  const base = {
    targetFollowers: data.targetFollowers ?? null,
    targetReachPerWeek: data.targetReachPerWeek ?? null,
    targetPostsPerWeek: data.targetPostsPerWeek ?? null,
    deadline,
    audienceNote: data.audienceNote ?? null,
  };

  // Chỉ ghi baseline khi có số follower THẬT (>0). Nếu lưu lúc chưa kết nối
  // (currentFollowers=0) thì để trống, lần lưu sau có số thật sẽ ghi — tránh
  // khoá baseline vào 0 làm sai tiến độ mãi mãi.
  const haveReal = currentFollowers > 0;

  if (!existing) {
    return prisma.goal.create({
      data: {
        id: "singleton",
        ...base,
        baselineFollowers: haveReal ? currentFollowers : null,
        baselineAt: haveReal ? new Date() : null,
      },
    });
  }
  // Ghi baseline nếu chưa có (null hoặc 0) và giờ đã có số thật.
  const needBaseline = existing.baselineFollowers == null || existing.baselineFollowers === 0;
  return prisma.goal.update({
    where: { id: "singleton" },
    data: {
      ...base,
      ...(needBaseline && haveReal ? { baselineFollowers: currentFollowers, baselineAt: new Date() } : {}),
    },
  });
}
