import { NextRequest, NextResponse } from "next/server";
import { runScheduledSync } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

// Endpoint cho cron ngoài (Vercel Cron, GitHub Actions, crontab...).
// Bảo vệ bằng CRON_SECRET: gọi kèm header `Authorization: Bearer <CRON_SECRET>`.
// Dùng khi deploy serverless — nơi scheduler trong tiến trình không chạy nền được.
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const r = await runScheduledSync();
  return NextResponse.json({ ok: true, result: r ?? null });
}

export const GET = handle;
export const POST = handle;
