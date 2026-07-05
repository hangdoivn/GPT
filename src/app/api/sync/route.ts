import { NextResponse } from "next/server";
import { syncAll } from "@/lib/sync";
import { FacebookApiError } from "@/lib/facebook/client";

export const dynamic = "force-dynamic";

// POST /api/sync — kéo dữ liệu mới nhất từ Facebook về
export async function POST() {
  try {
    const result = await syncAll();
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof FacebookApiError) {
      return NextResponse.json(
        { error: `Facebook API: ${e.message}`, fbCode: e.fbCode },
        { status: e.status || 502 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi không xác định" },
      { status: 500 },
    );
  }
}
