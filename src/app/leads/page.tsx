"use client";

import { useEffect, useState, useCallback } from "react";
import { QualityBadge, CrmBadge } from "@/components/ui";

interface Lead {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  province: string | null;
  message: string | null;
  source: string;
  score: number;
  quality: string;
  crmStatus: string;
  scoreReasons: string[];
  campaign?: { name: string } | null;
  createdAt: string;
}

interface ImportReport {
  imported: number;
  updated: number;
  junk: number;
  total: number;
  junkRate: number;
  hasCampaigns: boolean;
  byCampaign: { name: string; total: number; junk: number; junkRate: number }[];
  byReason: { reason: string; count: number }[];
}

const FILTERS = [
  { key: "", label: "Tất cả" },
  { key: "good", label: "Chất lượng" },
  { key: "warm", label: "Cần xác minh" },
  { key: "junk", label: "Rác" },
];

function rateTone(rate: number) {
  if (rate >= 40) return "text-junk";
  if (rate >= 20) return "text-warm";
  return "text-good";
}

function ImportReportCard({ report, onClose }: { report: ImportReport; onClose: () => void }) {
  const worst = report.byCampaign.filter((c) => c.name !== "(không rõ chiến dịch)");
  return (
    <div className="card p-4 border-l-4 border-l-brand bg-blue-50/40 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">✅ Đã phân tích {report.total} lead</div>
          <div className="text-sm text-gray-600 mt-0.5">
            {report.imported} mới · {report.updated} trùng (cập nhật) ·{" "}
            <span className={`font-semibold ${rateTone(report.junkRate)}`}>
              {report.junk} rác ({report.junkRate}%)
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Rác theo chiến dịch — thủ phạm nổi lên đầu */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
            🎯 Rác theo chiến dịch {worst.length > 0 && "(tệ nhất trên cùng)"}
          </div>
          {worst.length === 0 ? (
            <div className="text-sm text-gray-500">
              File không có cột chiến dịch. Thêm cột <code>campaign_name</code> / <code>chiến dịch</code>{" "}
              vào CSV để biết campaign nào ra rác và nên tắt cái nào.
            </div>
          ) : (
            <div className="space-y-1.5">
              {worst.slice(0, 6).map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{c.name}</div>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.junkRate >= 40 ? "bg-junk" : c.junkRate >= 20 ? "bg-warm" : "bg-good"}`}
                        style={{ width: `${Math.min(100, c.junkRate)}%` }}
                      />
                    </div>
                  </div>
                  <div className={`w-24 text-right font-semibold ${rateTone(c.junkRate)}`}>
                    {c.junkRate}% <span className="text-gray-400 font-normal">({c.junk}/{c.total})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rác vì lý do gì */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">🔎 Lead rác vì lý do gì</div>
          {report.byReason.length === 0 ? (
            <div className="text-sm text-green-600">✓ Không có lead rác trong lần import này.</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {report.byReason.slice(0, 6).map((r) => (
                <li key={r.reason} className="flex justify-between gap-2">
                  <span className="text-gray-700">{r.reason}</span>
                  <span className="font-semibold text-junk shrink-0">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {worst.some((c) => c.junkRate >= 40) && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-3 py-2">
          💡 <b>Khuyến nghị:</b> chiến dịch{" "}
          <b>{worst.filter((c) => c.junkRate >= 40).map((c) => c.name).slice(0, 3).join(", ")}</b>{" "}
          đang ra rác ≥40% — cân nhắc tắt hoặc siết targeting. Xem chi tiết chẩn đoán ở mục{" "}
          <a href="/audience" className="underline font-medium">Đánh giá tệp</a>.
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("quality", filter);
    if (q) params.set("q", q);
    const res = await fetch(`/api/leads?${params}`);
    setLeads(await res.json());
    setLoading(false);
  }, [filter, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    setImportReport(null);
    const text = await file.text();
    const res = await fetch("/api/leads/import", { method: "POST", body: text });
    const data = await res.json();
    if (res.ok) {
      setImportReport(data as ImportReport);
      load();
    } else {
      setImportMsg(data.error ?? "Import lỗi");
    }
    setImporting(false);
    e.target.value = "";
  }

  const counts = {
    total: leads.length,
    junk: leads.filter((l) => l.quality === "junk").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Lead & Lọc rác</h1>
          <p className="text-sm text-gray-500">
            Mỗi lead được chấm điểm tự động. Bấm vào lead để xem lý do bị đánh rác.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn-ghost cursor-pointer">
            {importing ? "⏳ Đang phân tích…" : "📥 Import CSV"}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} disabled={importing} />
          </label>
          <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
            ＋ Thêm lead
          </button>
        </div>
      </div>

      {importMsg && <div className="card p-3 text-sm text-gray-700 bg-blue-50">{importMsg}</div>}
      {importReport && <ImportReportCard report={importReport} onClose={() => setImportReport(null)} />}
      {showAdd && <AddLeadForm onDone={() => { setShowAdd(false); load(); }} />}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                filter === f.key ? "bg-white shadow-sm text-brand" : "text-gray-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="input max-w-xs"
          placeholder="Tìm tên / SĐT / email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="text-sm text-gray-500 ml-auto">
          {counts.total} lead · <span className="text-junk font-medium">{counts.junk} rác</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Đang tải…</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Không có lead nào. Import CSV hoặc đồng bộ Facebook.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Khách</th>
                  <th className="text-left px-4 py-3">SĐT</th>
                  <th className="text-left px-4 py-3">Tỉnh</th>
                  <th className="text-left px-4 py-3">Chiến dịch</th>
                  <th className="text-center px-4 py-3">Điểm</th>
                  <th className="text-left px-4 py-3">Chất lượng</th>
                  <th className="text-left px-4 py-3">Lý do / CRM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((l) => (
                  <LeadRow key={l.id} lead={l} onChange={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LeadRow({ lead, onChange }: { lead: Lead; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className={`hover:bg-gray-50 cursor-pointer ${lead.quality === "junk" ? "opacity-70" : ""}`} onClick={() => setOpen((v) => !v)}>
        <td className="px-4 py-3 font-medium">{lead.fullName}</td>
        <td className="px-4 py-3 font-mono text-xs">{lead.phone ?? "—"}</td>
        <td className="px-4 py-3">{lead.province ?? "—"}</td>
        <td className="px-4 py-3 text-gray-500 text-xs">{lead.campaign?.name ?? "—"}</td>
        <td className="px-4 py-3 text-center font-bold">{lead.score}</td>
        <td className="px-4 py-3"><QualityBadge quality={lead.quality} /></td>
        <td className="px-4 py-3"><CrmBadge status={lead.crmStatus} /></td>
      </tr>
      {open && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Lý do chấm điểm</div>
                {lead.scoreReasons.length === 0 ? (
                  <div className="text-sm text-green-600">✓ Không phát hiện dấu hiệu rác</div>
                ) : (
                  <ul className="text-sm text-red-600 list-disc pl-5 space-y-0.5">
                    {lead.scoreReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
                {lead.message && <div className="text-sm text-gray-600 mt-2">💬 {lead.message}</div>}
              </div>
              <CrmControls lead={lead} onChange={onChange} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CrmControls({ lead, onChange }: { lead: Lead; onChange: () => void }) {
  const STATUSES = [
    { key: "new", label: "Mới" },
    { key: "contacted", label: "Đã liên hệ" },
    { key: "qualified", label: "Tiềm năng" },
    { key: "won", label: "Chốt đơn" },
    { key: "lost", label: "Mất" },
  ];
  async function setStatus(crmStatus: string) {
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crmStatus }),
    });
    onChange();
  }
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Trạng thái chăm sóc</div>
      <div className="flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatus(s.key)}
            className={`badge border ${lead.crmStatus === s.key ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddLeadForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", province: "", message: "" });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    onDone();
  }
  return (
    <form onSubmit={submit} className="card p-4 grid md:grid-cols-3 gap-3">
      <div>
        <label className="label">Họ tên *</label>
        <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      </div>
      <div>
        <label className="label">Số điện thoại</label>
        <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div>
        <label className="label">Tỉnh/Thành</label>
        <input className="input" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
      </div>
      <div className="md:col-span-2">
        <label className="label">Ghi chú</label>
        <input className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      <div className="flex items-end">
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Đang lưu…" : "Lưu & chấm điểm"}</button>
      </div>
    </form>
  );
}
