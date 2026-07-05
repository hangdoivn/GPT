import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/seed-demo";

export const dynamic = "force-dynamic";

// POST /api/demo — nạp dữ liệu mẫu để dùng thử ngay
export async function POST() {
  const r = await seedDemo();
  return NextResponse.json({ ok: true, ...r });
}
