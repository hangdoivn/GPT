import { NextResponse } from "next/server";
import { refreshPageTokens } from "@/lib/facebook/auth";

export const dynamic = "force-dynamic";

// POST /api/facebook/refresh-tokens
// Lấy lại page access token mới từ user token (fix #10 khi page token cũ thiếu quyền).
export async function POST() {
  const r = await refreshPageTokens();
  if (!r) {
    return NextResponse.json(
      { error: "Chưa kết nối hoặc user token hết hạn — hãy Đăng nhập lại." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, updated: r.updated });
}
