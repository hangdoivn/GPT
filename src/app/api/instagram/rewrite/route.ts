import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rewriteFor } from "@/lib/instagram-copy";

export const dynamic = "force-dynamic";

const schema = z.object({
  igMediaId: z.string().optional(),
  caption: z.string().optional(),
  sourceFbId: z.string().optional(),
  targetFbId: z.string().min(1, "Thiếu page đích"),
});

// POST /api/instagram/rewrite — viết lại caption theo định vị page đích
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const result = await rewriteFor(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: `Không viết lại được caption: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
