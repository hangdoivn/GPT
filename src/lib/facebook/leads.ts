// Lấy lead từ Facebook Lead Ads qua Graph API.
// Luồng: Page -> leadgen_forms -> leads.
// https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving

import { getConfig, graphAll } from "./client";

export interface RawFbLead {
  id: string;
  created_time: string;
  ad_id?: string;
  campaign_id?: string;
  field_data: { name: string; values: string[] }[];
}

export interface NormalizedLead {
  fbLeadId: string;
  fullName: string;
  phone?: string;
  email?: string;
  province?: string;
  message?: string;
  campaignFbId?: string;
  createdTime: string;
}

// Ánh xạ tên field trong form (tiếng Việt/Anh) sang field chuẩn của app.
const FIELD_MAP: Record<string, keyof NormalizedLead> = {
  full_name: "fullName",
  name: "fullName",
  "họ_và_tên": "fullName",
  "họ_tên": "fullName",
  phone_number: "phone",
  phone: "phone",
  "số_điện_thoại": "phone",
  email: "email",
  city: "province",
  province: "province",
  "tỉnh_thành": "province",
  "tỉnh/thành_phố": "province",
};

function normalize(raw: RawFbLead): NormalizedLead {
  const lead: NormalizedLead = {
    fbLeadId: raw.id,
    fullName: "",
    campaignFbId: raw.campaign_id,
    createdTime: raw.created_time,
  };
  const extra: string[] = [];

  for (const f of raw.field_data ?? []) {
    const key = FIELD_MAP[f.name.toLowerCase().replace(/\s+/g, "_")];
    const value = (f.values ?? []).join(", ");
    if (key) {
      (lead[key] as string) = value;
    } else {
      extra.push(`${f.name}: ${value}`);
    }
  }
  if (extra.length) lead.message = extra.join(" | ");
  return lead;
}

/** Lấy toàn bộ lead của page (mọi form). */
export async function fetchLeads(sinceUnix?: number): Promise<NormalizedLead[]> {
  const cfg = getConfig();
  // Lấy danh sách form của page.
  const forms = await graphAll<{ id: string }>(`${cfg.pageId}/leadgen_forms`, {
    params: { fields: "id,name,status" },
  });

  const all: NormalizedLead[] = [];
  for (const form of forms) {
    const leads = await graphAll<RawFbLead>(`${form.id}/leads`, {
      params: {
        fields: "id,created_time,ad_id,campaign_id,field_data",
        filtering: sinceUnix
          ? JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: sinceUnix }])
          : undefined,
      },
    });
    all.push(...leads.map(normalize));
  }
  return all;
}

export { normalize as normalizeLead };
