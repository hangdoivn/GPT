import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isConnected } from "@/lib/facebook/auth";
import { publish } from "@/lib/instagram-copy";

export const dynamic = "force-dynamic";

const schema = z.object({
  igMediaId: z.string().min(1),
  sourceFbId: z.string().min(1),
  targetFbId: z.string().min(1),
  caption: z.string().optional(),
  mediaType: z.string().optional(),
});

// POST /api/instagram/publish — đăng 1 bài IG sang page đích (chống trùng)
export async function POST(req: NextRequest) {
  if (!(await isConnected())) {
    return NextResponse.json({ error: "Chưa kết nối Facebook." }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const result = await publish(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: `Đăng thất bại: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
