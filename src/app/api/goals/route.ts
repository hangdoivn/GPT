import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGoal, saveGoal } from "@/lib/goals";
import { resolveConfig, isConnected } from "@/lib/facebook/auth";
import { fetchPageInsights } from "@/lib/facebook/insights";

export const dynamic = "force-dynamic";

export async function GET() {
  const goal = await getGoal();
  return NextResponse.json(goal ?? {});
}

const schema = z.object({
  targetFollowers: z.number().int().positive().nullable().optional(),
  targetReachPerWeek: z.number().int().positive().nullable().optional(),
  targetPostsPerWeek: z.number().int().positive().nullable().optional(),
  deadline: z.string().nullable().optional(),
  audienceNote: z.string().max(300).nullable().optional(),
});

// POST /api/goals — lưu mục tiêu xây page.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Lấy follower hiện tại làm baseline (đo tiến độ). Không chặn nếu lỗi.
  let currentFollowers = 0;
  if (await isConnected()) {
    try {
      const cfg = await resolveConfig();
      const ins = await fetchPageInsights(cfg, 1);
      currentFollowers = ins.fans;
    } catch {
      /* giữ 0 */
    }
  }

  const saved = await saveGoal(parsed.data, currentFollowers);
  return NextResponse.json({ ok: true, goal: saved });
}
