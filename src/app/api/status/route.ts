import { NextResponse } from "next/server";
import { getConfig } from "@/lib/facebook/client";
import { isConnected, resolveConfig, hasAppCredentials } from "@/lib/facebook/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/status — trạng thái kết nối Facebook + dữ liệu hiện có
export async function GET() {
  const cfg = await resolveConfig();
  const [pages, leads, connected] = await Promise.all([
    prisma.page.count(),
    prisma.lead.count(),
    isConnected(),
  ]);
  return NextResponse.json({
    connected,
    hasAppCreds: hasAppCredentials(),
    hasAdAccount: Boolean(cfg.adAccountId),
    graphVersion: getConfig().graphVersion,
    pageId: cfg.pageId || null,
    connectedName: cfg.connectedName ?? null,
    counts: { pages, leads },
  });
}
