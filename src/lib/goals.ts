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

  if (!existing) {
    return prisma.goal.create({
      data: { id: "singleton", ...base, baselineFollowers: currentFollowers, baselineAt: new Date() },
    });
  }
  // Giữ baseline cũ (để đo tiến độ từ lúc bắt đầu); chỉ đặt baseline nếu chưa có.
  return prisma.goal.update({
    where: { id: "singleton" },
    data: {
      ...base,
      ...(existing.baselineFollowers == null
        ? { baselineFollowers: currentFollowers, baselineAt: new Date() }
        : {}),
    },
  });
}
