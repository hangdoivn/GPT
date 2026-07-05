// Tổng hợp số liệu cho dashboard: tỉ lệ lead rác, chi phí/lead thật theo campaign.
import { prisma } from "./db";

export interface Overview {
  totalLeads: number;
  goodLeads: number;
  warmLeads: number;
  junkLeads: number;
  junkRate: number; // %
  totalSpend: number;
  costPerLead: number; // trên toàn bộ lead
  costPerGoodLead: number; // trên lead thật (loại rác) — con số đáng quan tâm nhất
  activeCampaigns: number;
}

export async function getOverview(pageId?: string): Promise<Overview> {
  const where = pageId ? { pageId } : {};
  const [total, good, warm, junk, spendAgg, activeCampaigns] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, quality: "good" } }),
    prisma.lead.count({ where: { ...where, quality: "warm" } }),
    prisma.lead.count({ where: { ...where, quality: "junk" } }),
    prisma.campaign.aggregate({ where, _sum: { spend: true } }),
    prisma.campaign.count({ where: { ...where, status: "ACTIVE" } }),
  ]);

  const totalSpend = spendAgg._sum.spend ?? 0;
  const goodPlusWarm = good + warm;

  return {
    totalLeads: total,
    goodLeads: good,
    warmLeads: warm,
    junkLeads: junk,
    junkRate: total ? Math.round((junk / total) * 1000) / 10 : 0,
    totalSpend,
    costPerLead: total ? Math.round(totalSpend / total) : 0,
    costPerGoodLead: goodPlusWarm ? Math.round(totalSpend / goodPlusWarm) : 0,
    activeCampaigns,
  };
}

export interface CampaignQuality {
  id: string;
  name: string;
  status: string;
  spend: number;
  total: number;
  junk: number;
  junkRate: number;
  costPerGoodLead: number;
}

/** Xếp hạng campaign theo tỉ lệ rác — campaign xấu nổi lên đầu. */
export async function getCampaignQuality(pageId?: string): Promise<CampaignQuality[]> {
  const campaigns = await prisma.campaign.findMany({
    where: pageId ? { pageId } : {},
    include: { _count: { select: { leads: true } } },
  });

  const out: CampaignQuality[] = [];
  for (const c of campaigns) {
    const junk = await prisma.lead.count({ where: { campaignId: c.id, quality: "junk" } });
    const good = await prisma.lead.count({
      where: { campaignId: c.id, quality: { in: ["good", "warm"] } },
    });
    const total = c._count.leads;
    out.push({
      id: c.id,
      name: c.name,
      status: c.status,
      spend: c.spend,
      total,
      junk,
      junkRate: total ? Math.round((junk / total) * 1000) / 10 : 0,
      costPerGoodLead: good ? Math.round(c.spend / good) : 0,
    });
  }

  return out.sort((a, b) => b.junkRate - a.junkRate);
}
