import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPositioning, savePositioning } from "@/lib/instagram-copy";

export const dynamic = "force-dynamic";

// GET /api/instagram/positioning?pageId= — định vị page đích
export async function GET(req: NextRequest) {
  const pageId = req.nextUrl.searchParams.get("pageId") ?? "";
  if (!pageId) return NextResponse.json({ error: "Thiếu pageId." }, { status: 400 });
  return NextResponse.json(await getPositioning(pageId));
}

const schema = z.object({
  pageId: z.string().min(1),
  pageName: z.string().optional().nullable(),
  audience: z.string().optional().nullable(),
  voice: z.string().optional().nullable(),
  hashtags: z.string().optional().nullable(),
  cta: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// PUT /api/instagram/positioning — lưu định vị
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { pageId, ...rest } = parsed.data;
  const saved = await savePositioning(pageId, rest);
  return NextResponse.json(saved);
}
