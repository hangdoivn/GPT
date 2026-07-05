// Webhook nhận lead realtime từ Facebook Lead Ads.
// Đăng ký endpoint này trong App Dashboard > Webhooks > Page > leadgen.
import { NextRequest, NextResponse } from "next/server";
import { ensurePage, upsertLead } from "@/lib/sync";
import { graph } from "@/lib/facebook/client";
import { resolveConfig } from "@/lib/facebook/auth";
import type { RawFbLead } from "@/lib/facebook/leads";
import { normalizeLead } from "@/lib/facebook/leads";

export const dynamic = "force-dynamic";

// GET — Facebook verify subscription
export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// POST — nhận sự kiện leadgen
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || body.object !== "page") {
    return NextResponse.json({ ok: true });
  }

  const cfg = await resolveConfig();
  const pageId = await ensurePage();
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;
      try {
        const raw = await graph<RawFbLead>(leadgenId, {
          token: cfg.pageAccessToken,
          params: { fields: "id,created_time,ad_id,campaign_id,field_data" },
        });
        const l = normalizeLead(raw);
        await upsertLead(pageId, {
          fbLeadId: l.fbLeadId,
          fullName: l.fullName,
          phone: l.phone,
          email: l.email,
          province: l.province,
          message: l.message,
          source: "lead_ad",
        });
      } catch {
        // Không chặn webhook nếu 1 lead lỗi — Facebook sẽ retry.
      }
    }
  }
  return NextResponse.json({ ok: true });
}
