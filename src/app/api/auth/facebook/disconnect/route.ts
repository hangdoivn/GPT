import { NextResponse } from "next/server";
import { disconnect } from "@/lib/facebook/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/facebook/disconnect — xoá kết nối Facebook
export async function POST() {
  await disconnect();
  return NextResponse.json({ ok: true });
}
