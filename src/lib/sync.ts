// Service đồng bộ dữ liệu Facebook -> DB và chấm điểm lead.
// Tách khỏi API route để tái sử dụng (cron, webhook, nút "Đồng bộ" trên UI).

import { prisma } from "./db";
import { resolveConfig, isConnected } from "./facebook/auth";
import { fetchLeads } from "./facebook/leads";
import { fetchCampaigns } from "./facebook/ads";
import { fetchPage } from "./facebook/pages";
import { scoreLead } from "./scoring";

export interface SyncResult {
  page?: string;
  campaigns: number;
  leads: number;
  junk: number;
  skipped: boolean;
  message: string;
}

/** Đảm bảo có bản ghi Page trong DB, trả về id nội bộ. */
export async function ensurePage(): Promise<string> {
  const cfg = await resolveConfig();
  const fbPageId = cfg.pageId || "demo-page";

  const existing = await prisma.page.findUnique({ where: { fbPageId } });
  if (existing) return existing.id;

  let name = "Hàng Đôi";
  let category: string | undefined;
  let followers = 0;
  if (cfg.pageAccessToken && cfg.pageId) {
    try {
      const p = await fetchPage(cfg);
      name = p.name;
      category = p.category;
      followers = p.fan_count ?? 0;
    } catch {
      // giữ mặc định
    }
  }

  const created = await prisma.page.create({
    data: { fbPageId, name, category, followers, accessToken: cfg.pageAccessToken || null },
  });
  return created.id;
}

/** Chấm điểm + lưu 1 lead (upsert theo fbLeadId nếu có). */
export async function upsertLead(
  pageId: string,
  input: {
    fbLeadId?: string;
    fullName: string;
    phone?: string;
    email?: string;
    province?: string;
    message?: string;
    source?: string;
    campaignId?: string;
  },
): Promise<{ junk: boolean }> {
  const s = scoreLead(input);
  const data = {
    pageId,
    campaignId: input.campaignId ?? null,
    fullName: input.fullName || "(không tên)",
    phone: input.phone ?? null,
    email: input.email ?? null,
    province: input.province ?? null,
    message: input.message ?? null,
    source: input.source ?? "manual",
    score: s.score,
    quality: s.quality,
    scoreReasons: JSON.stringify(s.reasons),
  };

  if (input.fbLeadId) {
    await prisma.lead.upsert({
      where: { fbLeadId: input.fbLeadId },
      create: { ...data, fbLeadId: input.fbLeadId },
      update: data,
    });
  } else {
    await prisma.lead.create({ data });
  }
  return { junk: s.quality === "junk" };
}

/** Đồng bộ toàn bộ: page + campaigns + leads. */
export async function syncAll(): Promise<SyncResult> {
  if (!(await isConnected())) {
    return {
      campaigns: 0,
      leads: 0,
      junk: 0,
      skipped: true,
      message:
        "Chưa kết nối Facebook. Vào Cài đặt để đăng nhập, hoặc dùng Import CSV / dữ liệu demo.",
    };
  }

  const cfg = await resolveConfig();
  const pageId = await ensurePage();

  // Campaigns
  const campaigns = await fetchCampaigns(cfg);
  const fbToDbCampaign = new Map<string, string>();
  for (const c of campaigns) {
    const rec = await prisma.campaign.upsert({
      where: { fbCampaignId: c.fbCampaignId },
      create: {
        fbCampaignId: c.fbCampaignId,
        pageId,
        name: c.name,
        objective: c.objective,
        status: c.status,
        dailyBudget: c.dailyBudget,
        spend: c.spend,
        impressions: c.impressions,
        clicks: c.clicks,
      },
      update: {
        name: c.name,
        status: c.status,
        dailyBudget: c.dailyBudget,
        spend: c.spend,
        impressions: c.impressions,
        clicks: c.clicks,
      },
    });
    fbToDbCampaign.set(c.fbCampaignId, rec.id);
  }

  // Leads
  const leads = await fetchLeads(cfg);
  let junk = 0;
  for (const l of leads) {
    const r = await upsertLead(pageId, {
      fbLeadId: l.fbLeadId,
      fullName: l.fullName,
      phone: l.phone,
      email: l.email,
      province: l.province,
      message: l.message,
      source: "lead_ad",
      campaignId: l.campaignFbId ? fbToDbCampaign.get(l.campaignFbId) : undefined,
    });
    if (r.junk) junk++;
  }

  return {
    page: pageId,
    campaigns: campaigns.length,
    leads: leads.length,
    junk,
    skipped: false,
    message: `Đã đồng bộ ${campaigns.length} chiến dịch, ${leads.length} lead (${junk} rác).`,
  };
}
