// Lấy chiến dịch quảng cáo + insight từ Marketing API.
// https://developers.facebook.com/docs/marketing-api/insights

import { getConfig, graph, graphAll } from "./client";

export interface RawCampaign {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  daily_budget?: string; // đơn vị: cent -> chia 100
}

export interface CampaignInsight {
  spend: number;
  impressions: number;
  clicks: number;
}

export interface NormalizedCampaign {
  fbCampaignId: string;
  name: string;
  objective?: string;
  status: string;
  dailyBudget: number;
  spend: number;
  impressions: number;
  clicks: number;
}

/** Lấy các campaign của ad account. */
export async function fetchCampaigns(): Promise<NormalizedCampaign[]> {
  const cfg = getConfig();
  if (!cfg.adAccountId) return [];

  const campaigns = await graphAll<RawCampaign>(`${cfg.adAccountId}/campaigns`, {
    params: { fields: "id,name,objective,status,daily_budget" },
  });

  const out: NormalizedCampaign[] = [];
  for (const c of campaigns) {
    let insight: CampaignInsight = { spend: 0, impressions: 0, clicks: 0 };
    try {
      const res = await graph<{ data: Array<{ spend?: string; impressions?: string; clicks?: string }> }>(
        `${c.id}/insights`,
        { params: { fields: "spend,impressions,clicks", date_preset: "maximum" } },
      );
      const row = res.data?.[0];
      if (row) {
        insight = {
          spend: parseFloat(row.spend ?? "0"),
          impressions: parseInt(row.impressions ?? "0", 10),
          clicks: parseInt(row.clicks ?? "0", 10),
        };
      }
    } catch {
      // Campaign chưa chạy -> không có insight, bỏ qua.
    }

    out.push({
      fbCampaignId: c.id,
      name: c.name,
      objective: c.objective,
      status: c.status ?? "UNKNOWN",
      dailyBudget: c.daily_budget ? parseInt(c.daily_budget, 10) / 100 : 0,
      ...insight,
    });
  }
  return out;
}
