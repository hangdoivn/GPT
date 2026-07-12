import { NextRequest, NextResponse } from "next/server";
import { isConnected } from "@/lib/facebook/auth";
import { listMedia } from "@/lib/instagram-copy";

export const dynamic = "force-dynamic";

// GET /api/instagram/media?sourceFbId=&targetFbId=&after= — bài IG + trạng thái đã-copy
export async function GET(req: NextRequest) {
  if (!(await isConnected())) {
    return NextResponse.json({ error: "Chưa kết nối Facebook." }, { status: 400 });
  }
  const sp = req.nextUrl.searchParams;
  const sourceFbId = sp.get("sourceFbId") ?? "";
  const targetFbId = sp.get("targetFbId") ?? "";
  const after = sp.get("after") ?? undefined;
  if (!sourceFbId || !targetFbId) {
    return NextResponse.json({ error: "Thiếu sourceFbId hoặc targetFbId." }, { status: 400 });
  }
  try {
    const data = await listMedia({ sourceFbId, targetFbId, after });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: `Không kéo được bài Instagram: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
