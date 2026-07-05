import { NextRequest, NextResponse } from "next/server";
import { ensurePage, upsertLead } from "@/lib/sync";
import { parseCsv, mapCsvLeads } from "@/lib/csv";

export const dynamic = "force-dynamic";

// POST /api/leads/import — body là text CSV (từ Facebook Ads/Forms export)
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
  let imported = 0;
  let junk = 0;
  for (const l of leads) {
    if (!l.fullName && !l.phone) continue; // bỏ dòng rỗng
    const r = await upsertLead(pageId, { ...l, source: "csv" });
    imported++;
    if (r.junk) junk++;
  }

  return NextResponse.json({ ok: true, imported, junk, total: leads.length });
}
