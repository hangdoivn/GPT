import { NextResponse } from "next/server";
import { getOverview, getCampaignQuality } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const [overview, campaigns] = await Promise.all([
    getOverview(),
    getCampaignQuality(),
  ]);
  return NextResponse.json({ overview, campaigns });
}
