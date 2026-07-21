"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { STAGES, PRIORITIES, stageLabel } from "@/lib/projects";
import { fmtVnd } from "@/lib/format";

interface Task {
  id: string;
  title: string;
  assignee: string | null;
  status: string;
  dueDate: string | null;
}
interface Milestone {
  id: string;
  title: string;
  amount: number;
  dueDate: string | null;
  paid: boolean;
  paidAt: string | null;
}
interface Member {
  id: string;
  name: string;
  role: string | null;
}
interface Activity {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
}
interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  customerName: string;
  customerPhone: string | null;
  stage: string;
  priority: string;
  deadline: string | null;
  startDate: string | null;
  contractValue: number;
  leadId: string | null;
  tasks: Task[];
  milestones: Milestone[];
  members: Member[];
  activities: Activity[];
  progress: number;
  taskCounts: { total: number; done: number; doing: number; todo: number };
  payment: { contractValue: number; planned: number; paid: number; remaining: number; paidPct: number; unplanned: number };
  overdue: boolean;
  daysLeft: number | null;
}

const PRIORITY_LABEL: Record<string, string> = { low: "Thấp", normal: "Bình thường", high: "Cao" };

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("vi-VN") : "—");
const fmtDateTime = (s: string) => new Date(s).toLocaleString("vi-VN");

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [p, setP] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setP(await res.json());
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchProject(body: Record<string, unknown>) {
    await fetch(`/api/projects/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  if (loading) return <div className="text-gray-400">Đang tải dự án…</div>;
  if (notFound || !p)
    return (
      <div className="space-y-3">
        <div className="text-junk">Không tìm thấy dự án.</div>
        <Link href="/projects" className="text-brand hover:underline">
          ← Về danh sách dự án
        </Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <div>
        <Link href="/projects" className="text-sm text-brand hover:underline">
          ← Dự án
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-xs text-gray-400">{p.code}</div>
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <p className="text-sm text-gray-500">
            Khách: <b>{p.customerName}</b>
            {p.customerPhone ? ` · ${p.customerPhone}` : ""}
            {p.leadId && (
              <>
                {" · "}
                <span className="badge bg-green-100 text-green-700">từ lead chốt deal</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input w-auto"
            value={p.stage}
            onChange={(e) => patchProject({ stage: e.target.value })}
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Số liệu tổng quan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Tiến độ việc" value={`${p.progress}%`} sub={`${p.taskCounts.done}/${p.taskCounts.total} việc xong`} />
        <Stat label="Đã thu" value={fmtVnd(p.payment.paid)} sub={`${p.payment.paidPct}% giá trị HĐ`} tone="good" />
        <Stat label="Còn phải thu" value={fmtVnd(p.payment.remaining)} tone={p.payment.remaining > 0 ? "warn" : "default"} />
        <Stat
          label="Hạn"
          value={fmtDate(p.deadline)}
          sub={p.deadline ? (p.overdue ? `Trễ ${Math.abs(p.daysLeft ?? 0)} ngày` : `Còn ${p.daysLeft} ngày`) : "chưa đặt"}
          tone={p.overdue ? "bad" : "default"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <TasksCard project={p} onChange={load} />
          <MilestonesCard project={p} onChange={load} />
        </div>
        <div className="space-y-5">
          <InfoCard project={p} onSave={patchProject} />
          <MembersCard project={p} onChange={load} />
          <ActivityCard project={p} onChange={load} />
        </div>
      </div>
    </div>
  );
}

// ─── Đầu việc ──────────────────────────────────────────────────
function TasksCard({ project, onChange }: { project: Project; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    await fetch(`/api/projects/${project.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), assignee: assignee.trim() || null, dueDate: due || null }),
    });
    setBusy(false);
    setTitle("");
    setAssignee("");
    setDue("");
    onChange();
  }

  async function toggle(t: Task) {
    const next = t.status === "done" ? "todo" : "done";
    await fetch(`/api/projects/${project.id}/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    onChange();
  }

  async function del(t: Task) {
    await fetch(`/api/projects/${project.id}/tasks/${t.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">✅ Đầu việc ({project.taskCounts.done}/{project.taskCounts.total})</h2>
      </div>

      <div className="space-y-1.5">
        {project.tasks.length === 0 && <div className="text-sm text-gray-400">Chưa có đầu việc.</div>}
        {project.tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
            <input type="checkbox" checked={t.status === "done"} onChange={() => toggle(t)} className="w-4 h-4 accent-brand" />
            <div className="min-w-0 flex-1">
              <div className={`text-sm ${t.status === "done" ? "line-through text-gray-400" : ""}`}>{t.title}</div>
              <div className="text-xs text-gray-400">
                {t.assignee ? `👤 ${t.assignee}` : "chưa giao"}
                {t.dueDate ? ` · hạn ${fmtDate(t.dueDate)}` : ""}
              </div>
            </div>
            <button className="text-xs text-gray-300 hover:text-junk" onClick={() => del(t)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_140px_140px_auto] gap-2 mt-3">
        <input className="input" placeholder="Thêm đầu việc…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && add()} />
        <input className="input" placeholder="Giao cho" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
        <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn-primary" onClick={add} disabled={busy}>
          Thêm
        </button>
      </div>
    </div>
  );
}

// ─── Mốc thanh toán ────────────────────────────────────────────
function MilestonesCard({ project, onChange }: { project: Project; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const pay = project.payment;

  async function add() {
    if (!title.trim() || !amount) return;
    setBusy(true);
    await fetch(`/api/projects/${project.id}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), amount: parseInt(amount, 10), dueDate: due || null }),
    });
    setBusy(false);
    setTitle("");
    setAmount("");
    setDue("");
    onChange();
  }

  async function togglePaid(m: Milestone) {
    await fetch(`/api/projects/${project.id}/milestones/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !m.paid }),
    });
    onChange();
  }

  async function del(m: Milestone) {
    await fetch(`/api/projects/${project.id}/milestones/${m.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold">💰 Thanh toán</h2>
        <span className="text-sm text-gray-500">
          {fmtVnd(pay.paid)} / {fmtVnd(pay.contractValue)}
        </span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-1">
        <div className={`h-full rounded-full ${pay.paidPct >= 100 ? "bg-good" : "bg-brand"}`} style={{ width: `${pay.paidPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-3">
        <span>Đã thu {pay.paidPct}%</span>
        {pay.unplanned > 0 && <span>Chưa lên mốc: {fmtVnd(pay.unplanned)}</span>}
      </div>

      <div className="space-y-1.5">
        {project.milestones.length === 0 && <div className="text-sm text-gray-400">Chưa có mốc thanh toán.</div>}
        {project.milestones.map((m) => (
          <div key={m.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
            <input type="checkbox" checked={m.paid} onChange={() => togglePaid(m)} className="w-4 h-4 accent-good" />
            <div className="min-w-0 flex-1">
              <div className={`text-sm ${m.paid ? "text-gray-400" : ""}`}>{m.title}</div>
              <div className="text-xs text-gray-400">
                {m.paid ? `đã thu${m.paidAt ? ` ${fmtDate(m.paidAt)}` : ""}` : m.dueDate ? `hạn ${fmtDate(m.dueDate)}` : "chưa thu"}
              </div>
            </div>
            <div className={`text-sm font-medium ${m.paid ? "text-good" : "text-gray-700"}`}>{fmtVnd(m.amount)}</div>
            <button className="text-xs text-gray-300 hover:text-junk" onClick={() => del(m)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_140px_140px_auto] gap-2 mt-3">
        <input className="input" placeholder="Mốc (vd Đặt cọc)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" inputMode="numeric" placeholder="Số tiền" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
        <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn-primary" onClick={add} disabled={busy}>
          Thêm
        </button>
      </div>
    </div>
  );
}

// ─── Thông tin & chỉnh sửa ─────────────────────────────────────
function InfoCard({ project, onSave }: { project: Project; onSave: (b: Record<string, unknown>) => void }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    customerName: project.customerName,
    customerPhone: project.customerPhone ?? "",
    contractValue: project.contractValue ? String(project.contractValue) : "",
    deadline: project.deadline ? project.deadline.slice(0, 10) : "",
    priority: project.priority,
    description: project.description ?? "",
  });

  if (!edit) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">📋 Thông tin</h2>
          <button className="btn-ghost text-sm" onClick={() => setEdit(true)}>
            ✏️ Sửa
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="Giai đoạn" value={stageLabel(project.stage)} />
          <Row label="Ưu tiên" value={PRIORITY_LABEL[project.priority] ?? project.priority} />
          <Row label="Giá trị HĐ" value={fmtVnd(project.contractValue)} />
          <Row label="Bắt đầu" value={fmtDate(project.startDate)} />
          <Row label="Hạn" value={fmtDate(project.deadline)} />
          {project.description && (
            <div className="pt-2">
              <dt className="text-gray-500 mb-1">Mô tả</dt>
              <dd className="text-gray-700 whitespace-pre-wrap">{project.description}</dd>
            </div>
          )}
        </dl>
      </div>
    );
  }

  return (
    <div className="card p-5 border-l-4 border-l-brand">
      <h2 className="font-semibold mb-3">Sửa thông tin</h2>
      <div className="space-y-3">
        <div>
          <label className="label">Tên dự án</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Tên khách</label>
            <input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          </div>
          <div>
            <label className="label">SĐT</label>
            <input className="input" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Giá trị HĐ (đ)</label>
            <input className="input" inputMode="numeric" value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value.replace(/[^\d]/g, "") })} />
          </div>
          <div>
            <label className="label">Hạn</label>
            <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Ưu tiên</label>
          <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map((pr) => (
              <option key={pr} value={pr}>
                {PRIORITY_LABEL[pr]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Mô tả</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          className="btn-primary"
          onClick={() => {
            onSave({
              name: form.name.trim(),
              customerName: form.customerName.trim(),
              customerPhone: form.customerPhone.trim() || null,
              contractValue: form.contractValue ? parseInt(form.contractValue, 10) : 0,
              deadline: form.deadline || null,
              priority: form.priority,
              description: form.description.trim() || null,
            });
            setEdit(false);
          }}
        >
          Lưu
        </button>
        <button className="btn-ghost" onClick={() => setEdit(false)}>
          Huỷ
        </button>
      </div>
    </div>
  );
}

// ─── Thành viên ────────────────────────────────────────────────
function MembersCard({ project, onChange }: { project: Project; onChange: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return;
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), role: role.trim() || null }),
    });
    if (!res.ok) {
      setErr(res.status === 409 ? "Thành viên đã có." : "Không thêm được.");
      return;
    }
    setErr(null);
    setName("");
    setRole("");
    onChange();
  }

  async function del(m: Member) {
    await fetch(`/api/projects/${project.id}/members/${m.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">👥 Thành viên</h2>
      <div className="space-y-1.5">
        {project.members.length === 0 && <div className="text-sm text-gray-400">Chưa giao ai.</div>}
        {project.members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
            <div className="text-sm">
              {m.name}
              {m.role && <span className="text-gray-400"> · {m.role}</span>}
            </div>
            <button className="text-xs text-gray-300 hover:text-junk" onClick={() => del(m)}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_100px] gap-2 mt-3">
        <input className="input" placeholder="Tên" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input className="input" placeholder="Vai trò" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      {err && <div className="text-xs text-junk mt-1">{err}</div>}
      <button className="btn-ghost text-sm mt-2 w-full" onClick={add}>
        ＋ Giao thêm
      </button>
    </div>
  );
}

// ─── Nhật ký hoạt động ─────────────────────────────────────────
const KIND_ICON: Record<string, string> = { note: "📝", stage: "🔀", payment: "💰", task: "✅", system: "⚙️" };

function ActivityCard({ project, onChange }: { project: Project; onChange: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!note.trim() || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/${project.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: note.trim() }),
      });
      setNote("");
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">🗒️ Nhật ký</h2>
      <div className="flex gap-2 mb-3">
        <input className="input" placeholder="Ghi chú…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && add()} />
        <button className="btn-primary" onClick={add} disabled={busy}>
          Ghi
        </button>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {project.activities.length === 0 && <div className="text-sm text-gray-400">Chưa có hoạt động.</div>}
        {project.activities.map((a) => (
          <div key={a.id} className="text-sm border-l-2 border-gray-200 pl-3">
            <div className="text-gray-700">
              {KIND_ICON[a.kind] ?? "•"} {a.message}
            </div>
            <div className="text-xs text-gray-400">{fmtDateTime(a.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bộ phận nhỏ ───────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800 text-right">{value}</dd>
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
  const toneCls = { default: "text-gray-900", good: "text-good", bad: "text-junk", warn: "text-warm" }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
