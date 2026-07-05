// Nạp dữ liệu demo vào DB. Dùng chung cho seed script và nút "Nạp dữ liệu demo" trên UI.
import { prisma } from "./db";
import { ensurePage, upsertLead } from "./sync";
import { DEMO_CAMPAIGNS, DEMO_LEADS } from "./demo-data";

export async function seedDemo(): Promise<{ campaigns: number; leads: number; junk: number }> {
  const pageId = await ensurePage();

  const fbToDb = new Map<string, string>();
  for (const c of DEMO_CAMPAIGNS) {
    const rec = await prisma.campaign.upsert({
      where: { fbCampaignId: c.fbCampaignId },
      create: { ...c, pageId },
      update: { ...c, pageId },
    });
    fbToDb.set(c.fbCampaignId, rec.id);
  }

  let junk = 0;
  for (const l of DEMO_LEADS) {
    const r = await upsertLead(pageId, {
      fullName: l.fullName,
      phone: l.phone,
      email: l.email,
      province: l.province,
      message: l.message,
      source: "lead_ad",
      campaignId: fbToDb.get(l.campaign),
    });
    if (r.junk) junk++;
  }

  return { campaigns: DEMO_CAMPAIGNS.length, leads: DEMO_LEADS.length, junk };
}
