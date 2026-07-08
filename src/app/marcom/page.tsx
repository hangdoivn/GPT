"use client";

import { useEffect, useState } from "react";

interface Finding { sentiment: "good" | "warn" | "bad" | "info"; title: string; detail: string }
interface OpTask { area: "Media" | "Design" | "Content" | "Ads" | "Sale"; priority: "cao" | "vừa" | "thấp"; title: string; why: string }
interface PillarStat { key: string; label: string; posts: number; avg: number; sharePct: number; leadValue: "high" | "medium" | "low" }
interface FunnelStage { key: string; label: string; value: number }
interface FunnelConv { from: string; to: string; rate: number; label: string }
interface UnitEcon { name: string; spend: number; leads: number; qualified: number; won: number; cpl: number; cpql: number; cpw: number; junkRate: number }
interface PremiumFit {
  score: number;
  band: "aligned" | "mixed" | "mass";
  verdict: string;
  pillars: { positioning: number; valueSignal: number; targeting: number; leadQuality: number };
  findings: Finding[];
  shifts: OpTask[];
}
interface Data {
  connected: boolean;
  real: { insights: boolean; posts: boolean };
  goal: { targetFollowers?: number | null; deadline?: string | null; audienceNote?: string | null; icpMonthlyMinVnd?: number | null; icpNote?: string | null } | null;
  icpMinVnd: number;
  premiumFit: PremiumFit;
  forecast: {
    confidence: "low" | "medium" | "high";
    monthlyLeads: number;
    monthlyMessenger: number;
    monthlyQualified: number;
    monthlyWon: number;
    basisDays: number;
    assumptions: string[];
    findings: Finding[];
  };
  plan: { headline: { status: string; focus: string }; recommendedPostsPerWeek: number; tasks: OpTask[] };
  pillars: { pillars: PillarStat[]; findings: Finding[] };
  funnel: { stages: FunnelStage[]; conversions: FunnelConv[]; weakest?: FunnelConv; findings: Finding[] };
  unitEconomics: UnitEcon[];
}

const SENTIMENT: Record<string, { cls: string; icon: string }> = {
  good: { cls: "border-l-good bg-green-50", icon: "✅" },
  warn: { cls: "border-l-warm bg-amber-50", icon: "⚠️" },
  bad: { cls: "border-l-junk bg-red-50", icon: "🔻" },
  info: { cls: "border-l-brand bg-blue-50", icon: "💡" },
};
const AREA: Record<string, { cls: string; icon: string }> = {
  Media: { cls: "bg-purple-100 text-purple-700", icon: "🎬" },
  Design: { cls: "bg-pink-100 text-pink-700", icon: "🎨" },
  Content: { cls: "bg-blue-100 text-blue-700", icon: "✍️" },
  Ads: { cls: "bg-orange-100 text-orange-700", icon: "📣" },
  Sale: { cls: "bg-green-100 text-green-700", icon: "🤝" },
};
const PRIO: Record<string, string> = { cao: "bg-red-100 text-red-700", vừa: "bg-amber-100 text-amber-700", thấp: "bg-gray-100 text-gray-500" };
const STATUS: Record<string, { cls: string; label: string }> = {
  ahead: { cls: "bg-green-100 text-green-700", label: "Vượt tiến độ" },
  on_track: { cls: "bg-green-100 text-green-700", label: "Đúng lộ trình" },
  behind: { cls: "bg-red-100 text-red-700", label: "Chậm tiến độ" },
  no_goal: { cls: "bg-gray-100 text-gray-500", label: "Chưa đặt mục tiêu" },
  no_data: { cls: "bg-amber-100 text-amber-700", label: "Chưa có số thật" },
};
const fmt = (n: number) => n.toLocaleString("vi-VN");
const fmtVnd = (n: number) => (n > 0 ? `${fmt(n)}đ` : "—");

const BAND: Record<string, { cls: string; ring: string; label: string }> = {
  aligned: { cls: "text-good", ring: "border-good", label: "Đúng tệp cao cấp" },
  mixed: { cls: "text-warm", ring: "border-warm", label: "Hỗn hợp" },
  mass: { cls: "text-junk", ring: "border-junk", label: "Lệch tệp giá rẻ" },
};

export default function MarcomPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  function load() {
    fetch("/api/marcom").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  if (loading) return <div className="text-gray-400">Cố vấn đang phân tích…</div>;
  if (!data) return <div className="text-junk">Không tải được dữ liệu.</div>;

  const st = STATUS[data.plan.headline.status] ?? STATUS.no_goal;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Cố vấn MarCom</h1>
          <p className="text-sm text-gray-500">Vận hành theo mục tiêu — giao việc cụ thể cho team Media / Design / Ads / Sale.</p>
        </div>
        <span className={`badge ${st.cls}`}>● {st.label}</span>
      </div>

      {/* Định hướng chiến lược */}
      <div className="card p-5 border-l-4 border-l-brand bg-blue-50/40">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🧭</div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Định hướng tuần này</div>
            <div className="text-base font-medium mt-0.5">{data.plan.headline.focus}</div>
            {data.goal?.audienceNote && <div className="text-sm text-gray-600 mt-1">Tệp mục tiêu: <b>{data.goal.audienceNote}</b> · Nhịp đăng đề xuất: <b>{data.plan.recommendedPostsPerWeek} bài/tuần</b></div>}
          </div>
        </div>
      </div>

      {/* Dự báo tháng tới */}
      <ForecastCard f={data.forecast} />

      {/* Đánh giá tệp cao cấp (ICP) */}
      <PremiumFitCard data={data} onSaved={load} />

      {/* Kế hoạch giao việc */}
      <div className="card p-4">
        <h2 className="font-semibold mb-1">📋 Kế hoạch giao việc theo mục tiêu</h2>
        <p className="text-xs text-gray-500 mb-3">Đầu việc cụ thể, xếp theo ưu tiên — giao thẳng cho team.</p>
        {data.plan.tasks.length === 0 ? (
          <div className="text-sm text-gray-400">Chưa có đầu việc — đặt mục tiêu & kết nối số thật để cố vấn giao việc.</div>
        ) : (
          <div className="space-y-2">
            {data.plan.tasks.map((t, i) => {
              const a = AREA[t.area] ?? AREA.Content;
              return (
                <div key={i} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge ${a.cls}`}>{a.icon} {t.area}</span>
                    <span className={`badge ${PRIO[t.priority]}`}>Ưu tiên {t.priority}</span>
                  </div>
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">↳ {t.why}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Phễu chuyển đổi */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">🔻 Phễu chuyển đổi</h2>
        {data.funnel.stages.length > 0 && (
          <div className="space-y-2 mb-4">
            {data.funnel.stages.map((s, i) => {
              const max = Math.max(1, ...data.funnel.stages.map((x) => x.value));
              const conv = data.funnel.conversions.find((c) => c.from === s.key);
              return (
                <div key={s.key}>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-32 shrink-0 text-gray-600">{s.label}</div>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-brand/80 rounded flex items-center px-2 text-white text-xs font-medium" style={{ width: `${Math.max(8, (s.value / max) * 100)}%` }}>{fmt(s.value)}</div>
                    </div>
                  </div>
                  {conv && i < data.funnel.stages.length - 1 && (
                    <div className="text-[11px] text-gray-400 ml-32 pl-1">↓ {conv.rate}%{data.funnel.weakest && data.funnel.weakest.from === conv.from && data.funnel.weakest.to === conv.to ? " ⚠️ khâu rò rỉ" : ""}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <FindingList items={data.funnel.findings} />
      </div>

      {/* Trụ nội dung */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">🧱 Trụ nội dung</h2>
        {data.pillars.pillars.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {data.pillars.pillars.map((p) => {
              const max = Math.max(1, ...data.pillars.pillars.map((x) => x.avg));
              return (
                <div key={p.key} className="flex items-center gap-2 text-sm">
                  <div className="w-40 shrink-0 flex items-center gap-1">
                    {p.label}
                    {p.leadValue === "high" && <span className="text-[10px] text-good">★ chốt lead</span>}
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${(p.avg / max) * 100}%` }} />
                  </div>
                  <div className="w-32 text-right text-xs text-gray-500">{p.avg} tt/bài · {p.sharePct}% lịch</div>
                </div>
              );
            })}
          </div>
        )}
        <FindingList items={data.pillars.findings} />
      </div>

      {/* Đơn giá theo campaign */}
      {data.unitEconomics.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold">💰 Đơn giá thật theo chiến dịch</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Chiến dịch</th>
                  <th className="text-right px-4 py-2">Chi phí</th>
                  <th className="text-right px-4 py-2">Lead</th>
                  <th className="text-right px-4 py-2" title="Chi phí / lead">CPL</th>
                  <th className="text-right px-4 py-2" title="Chi phí / lead chất lượng">CPQL</th>
                  <th className="text-right px-4 py-2" title="Chi phí / đơn chốt">CP/chốt</th>
                  <th className="text-right px-4 py-2">Rác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.unitEconomics.map((c) => (
                  <tr key={c.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2 max-w-xs truncate">{c.name}</td>
                    <td className="px-4 py-2 text-right">{fmtVnd(c.spend)}</td>
                    <td className="px-4 py-2 text-right">{c.leads}</td>
                    <td className="px-4 py-2 text-right">{fmtVnd(c.cpl)}</td>
                    <td className="px-4 py-2 text-right font-medium">{fmtVnd(c.cpql)}</td>
                    <td className="px-4 py-2 text-right">{fmtVnd(c.cpw)}</td>
                    <td className={`px-4 py-2 text-right ${c.junkRate >= 40 ? "text-junk font-semibold" : c.junkRate >= 20 ? "text-warm" : "text-gray-500"}`}>{c.junkRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2 text-xs text-gray-400">CPQL = chi phí trên mỗi lead chất lượng (loại rác) — con số đáng theo dõi nhất cho hiệu quả thật.</div>
        </div>
      )}
    </div>
  );
}

function ForecastCard({ f }: { f: Data["forecast"] }) {
  const conf: Record<string, { cls: string; label: string }> = {
    low: { cls: "bg-amber-100 text-amber-700", label: "Tin cậy thấp" },
    medium: { cls: "bg-blue-100 text-blue-700", label: "Tin cậy vừa" },
    high: { cls: "bg-green-100 text-green-700", label: "Tin cậy cao" },
  };
  const c = conf[f.confidence] ?? conf.medium;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">📈 Dự báo tháng tới</h2>
        <span className={`badge ${c.cls}`}>● {c.label}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat label="Inbox Messenger" value={fmt(f.monthlyMessenger)} sub="/tháng" tone="brand" />
        <BigStat label="Tổng lead" value={fmt(f.monthlyLeads)} sub="/tháng" />
        <BigStat label="Lead chất lượng" value={fmt(f.monthlyQualified)} sub="/tháng" tone="good" />
        <BigStat label="Chốt đơn" value={fmt(f.monthlyWon)} sub="/tháng" tone="good" />
      </div>
      <div className="mt-3">
        <FindingList items={f.findings} />
      </div>
      <ul className="text-xs text-gray-400 mt-3 space-y-0.5 list-disc pl-4">
        {f.assumptions.map((a, i) => <li key={i}>{a}</li>)}
      </ul>
    </div>
  );
}

function BigStat({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "brand" | "good" }) {
  const toneCls = { default: "text-gray-900", brand: "text-brand", good: "text-good" }[tone];
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function PremiumFitCard({ data, onSaved }: { data: Data; onSaved: () => void }) {
  const pf = data.premiumFit;
  const b = BAND[pf.band] ?? BAND.mixed;
  const trM = Math.round((data.goal?.icpMonthlyMinVnd ?? data.icpMinVnd) / 1_000_000);
  const [edit, setEdit] = useState(false);
  const [minTr, setMinTr] = useState(String(trM));
  const [note, setNote] = useState(data.goal?.icpNote ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        icpMonthlyMinVnd: minTr.trim() ? parseInt(minTr, 10) * 1_000_000 : null,
        icpNote: note.trim() || null,
      }),
    });
    setBusy(false);
    setEdit(false);
    onSaved();
  }

  const PILLAR_LABELS: [keyof PremiumFit["pillars"], string][] = [
    ["positioning", "Định vị nội dung"],
    ["valueSignal", "Tín hiệu giá trị"],
    ["targeting", "Chất lượng nhắm"],
    ["leadQuality", "Chất lượng lead"],
  ];

  return (
    <div className={`card p-5 border-l-4 ${b.ring.replace("border-", "border-l-")}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">💎 Đánh giá phù hợp tệp khách cao cấp</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tệp mục tiêu: <b>doanh nghiệp doanh thu &gt; {trM}tr/tháng</b>
            {data.goal?.icpNote ? ` · ${data.goal.icpNote}` : ""}
          </p>
        </div>
        <button className="btn-ghost text-sm" onClick={() => setEdit((v) => !v)}>⚙️ Sửa tệp</button>
      </div>

      {edit && (
        <div className="mt-3 grid md:grid-cols-3 gap-3 items-end bg-gray-50 rounded-lg p-3">
          <div>
            <label className="label">Doanh thu tối thiểu (triệu/tháng)</label>
            <input className="input" inputMode="numeric" value={minTr} onChange={(e) => setMinTr(e.target.value.replace(/[^\d]/g, ""))} placeholder="25" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Mô tả tệp cao cấp</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="vd: chuỗi nhà hàng/hotel F&B, chủ đầu tư thương hiệu" />
          </div>
          <div className="md:col-span-3">
            <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Đang lưu…" : "Lưu & đánh giá lại"}</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-5 mt-4 flex-wrap">
        <div className={`w-24 h-24 rounded-full border-4 ${b.ring} flex flex-col items-center justify-center shrink-0`}>
          <div className={`text-2xl font-bold ${b.cls}`}>{pf.score}</div>
          <div className="text-[10px] text-gray-400">/100</div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className={`font-semibold ${b.cls}`}>● {b.label}</div>
          <p className="text-sm text-gray-600 mt-1">{pf.verdict}</p>
        </div>
      </div>

      {/* 4 trụ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {PILLAR_LABELS.map(([k, label]) => {
          const v = pf.pillars[k];
          const tone = v >= 60 ? "bg-good" : v >= 45 ? "bg-warm" : "bg-junk";
          return (
            <div key={k}>
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{label}</span><span className="font-semibold">{v}</span></div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${tone}`} style={{ width: `${v}%` }} /></div>
            </div>
          );
        })}
      </div>

      {/* Đầu việc dịch chuyển về tệp cao cấp */}
      {pf.shifts.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Dịch chuyển về tệp cao cấp</div>
          <div className="space-y-2">
            {pf.shifts.map((t, i) => {
              const a = AREA[t.area] ?? AREA.Content;
              return (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge ${a.cls}`}>{a.icon} {t.area}</span>
                    <span className={`badge ${PRIO[t.priority]}`}>Ưu tiên {t.priority}</span>
                  </div>
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">↳ {t.why}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FindingList({ items }: { items: Finding[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((f, i) => {
        const s = SENTIMENT[f.sentiment] ?? SENTIMENT.info;
        return (
          <div key={i} className={`border-l-4 rounded-r-lg px-4 py-2.5 ${s.cls}`}>
            <div className="font-medium text-sm">{s.icon} {f.title}</div>
            <div className="text-sm text-gray-600 mt-0.5">{f.detail}</div>
          </div>
        );
      })}
    </div>
  );
}
