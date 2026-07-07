import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensurePage, upsertLead } from "@/lib/sync";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Các kiểu sắp xếp cho phép (whitelist để chống inject).
const SORTS: Record<string, { [k: string]: "asc" | "desc" }> = {
  date_desc: { createdAt: "desc" }, // mới nhất (mặc định)
  date_asc: { createdAt: "asc" }, // cũ nhất
  score_desc: { score: "desc" }, // uy tín cao → thấp
  score_asc: { score: "asc" }, // rác/điểm thấp trước
};

// GET /api/leads?quality=junk&status=new&q=...&sort=score_asc
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const quality = sp.get("quality");
  const crmStatus = sp.get("status");
  const q = sp.get("q");
  const sort = sp.get("sort") ?? "date_desc";
  const orderBy = SORTS[sort] ?? SORTS.date_desc;

  const leads = await prisma.lead.findMany({
    where: {
      ...(quality ? { quality } : {}),
      ...(crmStatus ? { crmStatus } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q } },
              { phone: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    include: { campaign: { select: { name: true } } },
    orderBy,
    take: 500,
  });

  return NextResponse.json(
    leads.map((l) => ({ ...l, scoreReasons: safeParse(l.scoreReasons) })),
  );
}

const createSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  province: z.string().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
});

// POST /api/leads — thêm lead thủ công
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const pageId = await ensurePage();
  const r = await upsertLead(pageId, { ...parsed.data, source: parsed.data.source ?? "manual" });
  return NextResponse.json({ ok: true, junk: r.junk }, { status: 201 });
}

function safeParse(s: string | null): string[] {
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
