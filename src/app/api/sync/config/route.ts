import { NextRequest, NextResponse } from "next/server";
import { getSyncConfig, updateSyncConfig, INTERVAL_OPTIONS } from "@/lib/sync-config";
import { restartScheduler } from "@/lib/scheduler";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/sync/config — cấu hình + kết quả đồng bộ gần nhất
export async function GET() {
  const c = await getSyncConfig();
  return NextResponse.json({ ...c, intervalOptions: INTERVAL_OPTIONS });
}

const schema = z.object({
  enabled: z.boolean().optional(),
  intervalMinutes: z.number().int().refine((n) => INTERVAL_OPTIONS.includes(n), "Chu kỳ không hợp lệ").optional(),
});

// POST /api/sync/config — cập nhật lịch rồi khởi động lại scheduler
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const c = await updateSyncConfig(parsed.data);
  await restartScheduler();
  return NextResponse.json({ ...c, intervalOptions: INTERVAL_OPTIONS });
}
