import { NextResponse } from "next/server";
import { isConfigured, getConfig } from "@/lib/facebook/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/status — trạng thái kết nối Facebook + dữ liệu hiện có
export async function GET() {
  const cfg = getConfig();
  const [pages, leads] = await Promise.all([prisma.page.count(), prisma.lead.count()]);
  return NextResponse.json({
    configured: isConfigured(),
    hasAppCreds: Boolean(cfg.appId && cfg.appSecret),
    hasAdAccount: Boolean(cfg.adAccountId),
    graphVersion: cfg.graphVersion,
    pageId: cfg.pageId || null,
    counts: { pages, leads },
  });
}
