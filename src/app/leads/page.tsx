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

const FILTERS = [
  { key: "", label: "Tất cả" },
  { key: "good", label: "Chất lượng" },
  { key: "warm", label: "Cần xác minh" },
  { key: "junk", label: "Rác" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

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
    const text = await file.text();
    const res = await fetch("/api/leads/import", { method: "POST", body: text });
    const data = await res.json();
    if (res.ok) {
      setImportMsg(`Import ${data.imported} lead (${data.junk} rác).`);
      load();
    } else {
      setImportMsg(data.error ?? "Import lỗi");
    }
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
            📥 Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
          </label>
          <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
            ＋ Thêm lead
          </button>
        </div>
      </div>

      {importMsg && <div className="card p-3 text-sm text-gray-700 bg-blue-50">{importMsg}</div>}
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
