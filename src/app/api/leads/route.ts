import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensurePage, upsertLead } from "@/lib/sync";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/leads?quality=junk&status=new&q=...
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const quality = sp.get("quality");
  const crmStatus = sp.get("status");
  const q = sp.get("q");

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
    orderBy: { createdAt: "desc" },
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
