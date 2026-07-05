import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setActivePage, resolveConfig } from "@/lib/facebook/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/facebook/pages — danh sách page đã kết nối + page đang chọn
export async function GET() {
  const [pages, cfg] = await Promise.all([
    prisma.page.findMany({ orderBy: { name: "asc" }, select: { fbPageId: true, name: true, followers: true } }),
    resolveConfig(),
  ]);
  return NextResponse.json({ pages, activeFbPageId: cfg.pageId || null });
}

const schema = z.object({ fbPageId: z.string().min(1) });

// POST /api/facebook/pages — chọn page đang quản lý
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu fbPageId" }, { status: 400 });
  }
  await setActivePage(parsed.data.fbPageId);
  return NextResponse.json({ ok: true });
}
