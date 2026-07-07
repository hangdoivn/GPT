import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scoreLead } from "@/lib/scoring";

export const dynamic = "force-dynamic";

// POST /api/leads/rescore — chấm điểm lại TẤT CẢ lead theo bộ luật hiện tại.
// Dùng khi cập nhật công thức chấm điểm (vd nhận diện "Người dùng Facebook" là rác).
export async function POST() {
  const leads = await prisma.lead.findMany({
    select: { id: true, fullName: true, phone: true, email: true, province: true, message: true, source: true },
  });

  let changed = 0;
  const dist = { good: 0, warm: 0, junk: 0 };
  for (const l of leads) {
    const s = scoreLead(l);
    dist[s.quality]++;
    await prisma.lead.update({
      where: { id: l.id },
      data: { score: s.score, quality: s.quality, scoreReasons: JSON.stringify(s.reasons) },
    });
    changed++;
  }

  return NextResponse.json({ ok: true, total: changed, dist });
}
