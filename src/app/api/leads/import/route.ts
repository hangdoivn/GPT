import { NextRequest, NextResponse } from "next/server";
import { ensurePage, upsertLead, ensureCsvCampaign } from "@/lib/sync";
import { parseCsv, mapCsvLeads } from "@/lib/csv";
import { checkPhone } from "@/lib/scoring/phone";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/leads/import — body là text CSV (từ Facebook Ads/Forms export, hoặc CRM Sheet)
// Trả về báo cáo phân tích rác: theo chiến dịch + theo lý do, để biết campaign nào nên tắt.
export async function POST(req: NextRequest) {
  const text = await req.text();
  if (!text.trim()) {
    return NextResponse.json({ error: "File CSV rỗng" }, { status: 400 });
  }

  const records = parseCsv(text);
  const leads = mapCsvLeads(records);
  if (leads.length === 0) {
    return NextResponse.json({ error: "Không đọc được dòng nào từ CSV" }, { status: 400 });
  }

  const pageId = await ensurePage();

  // Nạp sẵn SĐT đã có (chuẩn hoá) để dedup — import lại file không nhân đôi.
  const existing = await prisma.lead.findMany({ where: { pageId }, select: { id: true, phone: true } });
  const byPhone = new Map<string, string>(); // normalized phone -> leadId
  for (const e of existing) {
    const n = checkPhone(e.phone).normalized;
    if (n) byPhone.set(n, e.id);
  }

  const campaignCache = new Map<string, string>(); // tên campaign -> id
  const perCampaign = new Map<string, { name: string; total: number; junk: number }>();
  const reasonCounts = new Map<string, number>();

  let imported = 0;
  let updated = 0;
  let junk = 0;

  for (const l of leads) {
    if (!l.fullName && !l.phone) continue; // bỏ dòng rỗng

    // Gắn campaign từ tên (nếu file có cột chiến dịch/nhóm QC).
    let campaignId: string | undefined;
    const cname = l.campaign?.trim();
    if (cname) {
      campaignId = campaignCache.get(cname);
      if (!campaignId) {
        campaignId = await ensureCsvCampaign(pageId, cname);
        campaignCache.set(cname, campaignId);
      }
    }

    // Dedup theo SĐT chuẩn hoá.
    const norm = checkPhone(l.phone).normalized;
    const existingId = norm ? byPhone.get(norm) : undefined;

    const r = await upsertLead(pageId, {
      ...l,
      source: "csv",
      campaignId,
      leadId: existingId,
    });

    if (existingId) updated++;
    else imported++;
    // Lưu id thật để lần trùng SĐT tiếp theo (kể cả trong cùng file) sẽ update, không nhân đôi.
    if (norm) byPhone.set(norm, r.id);
    if (r.junk) junk++;

    // Gom theo campaign.
    const key = cname || "(không rõ chiến dịch)";
    const pc = perCampaign.get(key) ?? { name: key, total: 0, junk: 0 };
    pc.total++;
    if (r.junk) pc.junk++;
    perCampaign.set(key, pc);

    // Gom theo lý do (chỉ lead rác).
    if (r.junk) {
      for (const reason of r.reasons) {
        // gộp lý do SĐT về nhóm chung để đếm gọn.
        const g = reason.startsWith("SĐT không hợp lệ")
          ? "SĐT không hợp lệ / số ảo"
          : reason.startsWith("Chứa từ khoá spam")
            ? "Chứa từ khoá spam"
            : reason;
        reasonCounts.set(g, (reasonCounts.get(g) ?? 0) + 1);
      }
    }
  }

  const byCampaign = [...perCampaign.values()]
    .map((c) => ({
      name: c.name,
      total: c.total,
      junk: c.junk,
      junkRate: c.total ? Math.round((c.junk / c.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.junkRate - a.junkRate || b.total - a.total);

  const byReason = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const totalHandled = imported + updated;
  return NextResponse.json({
    ok: true,
    imported,
    updated,
    junk,
    total: totalHandled,
    junkRate: totalHandled ? Math.round((junk / totalHandled) * 1000) / 10 : 0,
    hasCampaigns: byCampaign.some((c) => c.name !== "(không rõ chiến dịch)"),
    byCampaign,
    byReason,
  });
}
