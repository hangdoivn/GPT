import { NextResponse } from "next/server";
import { isConnected } from "@/lib/facebook/auth";
import { listSourcesAndTargets } from "@/lib/instagram-copy";

export const dynamic = "force-dynamic";

// GET /api/instagram/sources — page nguồn (có IG) + page đích (mọi page có token)
export async function GET() {
  if (!(await isConnected())) {
    return NextResponse.json({ connected: false, sources: [], targets: [] });
  }
  try {
    const data = await listSourcesAndTargets();
    return NextResponse.json({ connected: true, ...data });
  } catch (e) {
    return NextResponse.json(
      { error: `Không tải được danh sách page: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
