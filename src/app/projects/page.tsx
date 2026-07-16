"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { STAGES, STAGE_FLOW } from "@/lib/projects";
import { fmtVnd } from "@/lib/format";

interface Row {
  id: string;
  code: string;
  name: string;
  customerName: string;
  customerPhone: string | null;
  stage: string;
  priority: string;
  deadline: string | null;
  contractValue: number;
  leadId: string | null;
  progress: number;
  tasks: { total: number; done: number; doing: number; todo: number };
  memberCount: number;
  payment: { paid: number; remaining: number; paidPct: number; contractValue: number };
  overdue: boolean;
  daysLeft: number | null;
}
interface Summary {
  total: number;
  active: number;
  done: number;
  overdue: number;
  byStage: Record<string, number>;
  contractTotal: number;
  paidTotal: number;
  remainingTotal: number;
}

const PRIORITY: Record<string, { cls: string; label: string }> = {
  high: { cls: "bg-red-100 text-red-700", label: "Ưu tiên cao" },
  normal: { cls: "bg-gray-100 text-gray-500", label: "Bình thường" },
  low: { cls: "bg-gray-100 text-gray-400", label: "Thấp" },
};

export default function ProjectsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setRows(data.projects ?? []);
    setSummary(data.summary ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function move(row: Row, dir: 1 | -1) {
    let next: string;
    const idx = STAGE_FLOW.indexOf(row.stage);
    if (idx === -1) {
      // Đang ở "cancelled" → khôi phục về đầu luồng.
      next = "brief";
    } else {
      next = STAGE_FLOW[Math.min(STAGE_FLOW.length - 1, Math.max(0, idx + dir))];
    }
    if (next === row.stage) return;
    await fetch(`/api/projects/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    load();
  }

  async function cancel(row: Row) {
    if (!confirm(`Huỷ dự án ${row.code}?`)) return;
    await fetch(`/api/projects/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "cancelled" }),
    });
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dự án (PRJ)</h1>
          <p className="text-sm text-gray-500">
            Quản lý dự án sau khi chốt deal: giao việc, theo dõi tiến độ, thanh toán & bàn giao.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          ＋ Tạo dự án
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Đang chạy" value={summary.active} sub={`${summary.total} tổng · ${summary.done} xong`} />
          <Stat label="Quá hạn" value={summary.overdue} tone={summary.overdue > 0 ? "bad" : "default"} />
          <Stat label="Giá trị HĐ" value={fmtVnd(summary.contractTotal)} />
          <Stat label="Đã thu" value={fmtVnd(summary.paidTotal)} tone="good" />
          <Stat label="Còn phải thu" value={fmtVnd(summary.remainingTotal)} tone={summary.remainingTotal > 0 ? "warn" : "default"} />
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">Đang tải dự án…</div>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-2">📁</div>
          <div className="font-semibold text-lg">Chưa có dự án</div>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Khi kéo một lead sang cột <b>Chốt đơn</b> trong CRM, hệ thống tự tạo dự án ở đây. Hoặc bấm{" "}
            <b>Tạo dự án</b> để thêm thủ công.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAGES.map((col) => {
            const items = rows.filter((r) => r.stage === col.key);
            return (
              <div key={col.key} className={`card border-t-4 ${col.color} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{col.label}</span>
                  <span className="badge bg-gray-100 text-gray-500">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((r) => (
                    <ProjectCard key={r.id} row={r} onMove={move} onCancel={cancel} />
                  ))}
                  {items.length === 0 && <div className="text-xs text-gray-300 text-center py-3">trống</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={load} />}
    </div>
  );
}

function ProjectCard({
  row,
  onMove,
  onCancel,
}: {
  row: Row;
  onMove: (r: Row, dir: 1 | -1) => void;
  onCancel: (r: Row) => void;
}) {
  const pr = PRIORITY[row.priority] ?? PRIORITY.normal;
  const cancelled = row.stage === "cancelled";
  return (
    <div className="rounded-lg border border-gray-200 p-2.5 bg-white">
      <div className="flex items-center justify-between gap-1">
        <Link href={`/projects/${row.id}`} className="font-mono text-[11px] text-brand hover:underline">
          {row.code}
        </Link>
        {row.priority !== "normal" && <span className={`badge ${pr.cls}`}>{pr.label}</span>}
      </div>
      <Link href={`/projects/${row.id}`} className="block font-medium text-sm mt-0.5 hover:underline truncate">
        {row.name}
      </Link>
      <div className="text-xs text-gray-500 truncate">
        {row.customerName}
        {row.customerPhone ? ` · ${row.customerPhone}` : ""}
      </div>

      {/* Tiến độ việc */}
      <div className="mt-2">
        <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
          <span>{row.tasks.done}/{row.tasks.total} việc</span>
          <span>{row.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full" style={{ width: `${row.progress}%` }} />
        </div>
      </div>

      {/* Tài chính + hạn */}
      <div className="flex items-center justify-between mt-2 text-[11px]">
        <span className={row.payment.paidPct >= 100 ? "text-good" : "text-gray-500"}>
          Thu {row.payment.paidPct}%
        </span>
        {row.deadline &&
          (row.overdue ? (
            <span className="text-junk font-medium">Trễ {Math.abs(row.daysLeft ?? 0)}n</span>
          ) : row.daysLeft != null ? (
            <span className="text-gray-500">Còn {row.daysLeft}n</span>
          ) : null)}
      </div>

      {/* Điều khiển */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        {cancelled ? (
          <button className="text-xs text-gray-400 hover:text-brand" onClick={() => onMove(row, 1)}>
            ↩ Khôi phục
          </button>
        ) : (
          <>
            <button className="text-xs text-gray-400 hover:text-brand" onClick={() => onMove(row, -1)}>
              ◀
            </button>
            <button className="text-[11px] text-gray-300 hover:text-junk" onClick={() => onCancel(row)} title="Huỷ dự án">
              huỷ
            </button>
            <button className="text-xs text-gray-400 hover:text-brand" onClick={() => onMove(row, 1)}>
              ▶
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    customerName: "",
    customerPhone: "",
    contractValue: "",
    deadline: "",
    priority: "normal",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!form.name.trim() || !form.customerName.trim()) {
      setErr("Cần tên dự án và tên khách.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || null,
        contractValue: form.contractValue ? parseInt(form.contractValue, 10) : 0,
        deadline: form.deadline || null,
        priority: form.priority,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Không tạo được dự án.");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-lg mb-3">Tạo dự án</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Tên dự án</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="vd: Bộ nhận diện + fanpage cho Quán X" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Tên khách</label>
              <input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div>
              <label className="label">SĐT khách</label>
              <input className="input" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="label">Giá trị HĐ (đ)</label>
              <input className="input" inputMode="numeric" value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value.replace(/[^\d]/g, "") })} placeholder="vd 15000000" />
            </div>
            <div>
              <label className="label">Hạn</label>
              <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <label className="label">Ưu tiên</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Thấp</option>
                <option value="normal">Bình thường</option>
                <option value="high">Cao</option>
              </select>
            </div>
          </div>
          {err && <div className="text-sm text-junk">{err}</div>}
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Đang tạo…" : "Tạo dự án"}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneCls = { default: "text-gray-900", good: "text-good", bad: "text-junk", warm: "text-warm", warn: "text-warm" }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
