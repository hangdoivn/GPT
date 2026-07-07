"use client";

import { useEffect, useState, useCallback } from "react";

interface Finding {
  sentiment: "good" | "warn" | "bad" | "info";
  title: string;
  detail: string;
}
interface WeekdayStat {
  weekday: number;
  label: string;
  posts: number;
  engagement: number;
  avg: number;
}
interface HourStat {
  hour: number;
  posts: number;
  engagement: number;
}
interface DemoRow {
  label: string;
  reach: number;
  pct: number;
}
interface GrowthData {
  connected: boolean;
  postsSource: "facebook" | "demo";
  pageSource: "facebook" | "demo";
  real: { insights: boolean; posts: boolean };
  followers: number | null;
  bestTime: {
    hasData: boolean;
    byWeekday: WeekdayStat[];
    byHour: HourStat[];
    bestWeekday?: WeekdayStat;
    bestHourWindow?: { from: number; to: number; engagement: number };
    findings: Finding[];
  };
  demographics: { available: boolean; ageGender: DemoRow[]; region: DemoRow[]; totalReach: number; note?: string };
  projection: {
    hasGoal: boolean;
    currentFollowers: number;
    targetFollowers?: number | null;
    followPerWeek: number;
    weeksToDeadline?: number | null;
    projectedFollowers?: number | null;
    followGap?: number | null;
    neededFollowPerWeek?: number | null;
    onTrackFollowers?: boolean | null;
    reachPerWeek: number;
    targetReachPerWeek?: number | null;
    postsPerWeek: number;
    targetPostsPerWeek?: number | null;
    findings: Finding[];
  };
  goal: {
    targetFollowers?: number | null;
    targetReachPerWeek?: number | null;
    targetPostsPerWeek?: number | null;
    deadline?: string | null;
    audienceNote?: string | null;
  } | null;
}

const SENTIMENT: Record<string, { cls: string; icon: string }> = {
  good: { cls: "border-l-good bg-green-50", icon: "✅" },
  warn: { cls: "border-l-warm bg-amber-50", icon: "⚠️" },
  bad: { cls: "border-l-junk bg-red-50", icon: "🔻" },
  info: { cls: "border-l-brand bg-blue-50", icon: "💡" },
};

const fmt = (n: number) => n.toLocaleString("vi-VN");

export default function GrowthPage() {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/growth")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  if (loading) return <div className="text-gray-400">Đang phân tích tăng trưởng…</div>;
  if (!data) return <div className="text-junk">Không tải được dữ liệu.</div>;

  const p = data.projection;
  const ri = data.real.insights; // có số reach/follow thật
  const rp = data.real.posts; // có bài đăng thật

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Mục tiêu & Tăng trưởng</h1>
          <p className="text-sm text-gray-500">Đặt đích xây tệp đúng, theo dõi follower/reach theo số lượng & thời gian.</p>
        </div>
        <span className={`badge ${ri ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {ri ? "● Số liệu thật" : "○ Chưa có số thật"}
        </span>
      </div>

      {!ri && (
        <div className="card p-3 text-sm text-amber-800 bg-amber-50 border-l-4 border-l-warm">
          ⚠️ Chưa đọc được số liệu thật của page (reach/follow). Vào <b>Cài đặt → “🔄 Làm mới token trang”</b> rồi
          quay lại — follower, nhịp tăng, dự phóng sẽ hiện số thật. Mục tiêu bạn đặt vẫn được lưu.
        </div>
      )}

      {/* Mục tiêu + dự phóng */}
      <GoalCard data={data} onSaved={load} />

      {/* Thẻ nhịp tăng trưởng */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Follower hiện tại" value={ri && data.followers != null ? fmt(data.followers) : "—"} />
        <Stat label="Follow ròng/tuần" value={ri ? `${p.followPerWeek >= 0 ? "+" : ""}${fmt(p.followPerWeek)}` : "—"} tone={ri ? (p.followPerWeek > 0 ? "good" : p.followPerWeek < 0 ? "bad" : "default") : "default"} />
        <Stat label="Reach/tuần" value={ri ? fmt(p.reachPerWeek) : "—"} />
        <Stat label="Nhịp đăng" value={rp ? `${p.postsPerWeek} bài/tuần` : "—"} tone={rp && p.postsPerWeek >= 3 ? "good" : rp ? "warn" : "default"} />
      </div>

      {/* Nhận định dự phóng mục tiêu */}
      {p.findings.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold mb-3">🎯 Dự phóng đạt mục tiêu</h2>
          <FindingList items={p.findings} />
        </div>
      )}

      {/* Thời điểm đăng tốt nhất */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">🕐 Thời điểm đăng tốt nhất</h2>
          <span className={`badge ${data.postsSource === "facebook" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {data.postsSource === "facebook" ? "● Từ bài thật" : "○ Số minh hoạ"}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Giờ Việt Nam. Cột càng cao = tương tác trung bình/bài càng lớn.</p>
        {data.bestTime.hasData ? (
          <>
            <WeekdayBars stats={data.bestTime.byWeekday} best={data.bestTime.bestWeekday?.weekday} />
            <HourStrip stats={data.bestTime.byHour} window={data.bestTime.bestHourWindow} />
          </>
        ) : null}
        <div className="mt-3">
          <FindingList items={data.bestTime.findings} />
        </div>
      </div>

      {/* Nhân khẩu người xem (từ ads) */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">👥 Chi tiết người xem (tệp)</h2>
          <span className={`badge ${data.demographics.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {data.demographics.available ? "● Từ ads thật" : "○ Chưa có dữ liệu"}
          </span>
        </div>
        {data.demographics.note && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">ℹ️ {data.demographics.note}</p>}
        {data.demographics.available ? (
          <div className="grid md:grid-cols-2 gap-5">
            <DemoTable title="Tuổi · Giới tính" rows={data.demographics.ageGender} />
            <DemoTable title="Khu vực" rows={data.demographics.region} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Facebook đã gỡ nhân khẩu follower organic (2024). Để biết tệp người xem theo tuổi/giới/vùng,
            cần đang chạy quảng cáo — số liệu sẽ tự hiện ở đây.
          </p>
        )}
      </div>
    </div>
  );
}

function GoalCard({ data, onSaved }: { data: GrowthData; onSaved: () => void }) {
  const g = data.goal;
  const [edit, setEdit] = useState(!g);
  const [form, setForm] = useState({
    targetFollowers: g?.targetFollowers?.toString() ?? "",
    targetReachPerWeek: g?.targetReachPerWeek?.toString() ?? "",
    targetPostsPerWeek: g?.targetPostsPerWeek?.toString() ?? "",
    deadline: g?.deadline ?? "",
    audienceNote: g?.audienceNote ?? "",
  });
  const [busy, setBusy] = useState(false);
  const p = data.projection;

  async function save() {
    setBusy(true);
    const toNum = (s: string) => (s.trim() ? parseInt(s, 10) : null);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetFollowers: toNum(form.targetFollowers),
        targetReachPerWeek: toNum(form.targetReachPerWeek),
        targetPostsPerWeek: toNum(form.targetPostsPerWeek),
        deadline: form.deadline || null,
        audienceNote: form.audienceNote || null,
      }),
    });
    setBusy(false);
    setEdit(false);
    onSaved();
  }

  if (edit) {
    return (
      <div className="card p-5 border-l-4 border-l-brand">
        <h2 className="font-semibold mb-3">🎯 Đặt mục tiêu xây page</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Đích follower" value={form.targetFollowers} onChange={(v) => setForm({ ...form, targetFollowers: v })} placeholder="vd 20000" />
          <Field label="Đích reach/tuần" value={form.targetReachPerWeek} onChange={(v) => setForm({ ...form, targetReachPerWeek: v })} placeholder="vd 50000" />
          <Field label="Đích bài/tuần" value={form.targetPostsPerWeek} onChange={(v) => setForm({ ...form, targetPostsPerWeek: v })} placeholder="vd 4" />
          <div>
            <label className="label">Hạn hoàn thành</label>
            <input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Tệp mục tiêu (mô tả)</label>
            <input className="input" placeholder="vd: chủ nhà hàng / quán cafe / hotel F&B tại Đà Nẵng" value={form.audienceNote} onChange={(e) => setForm({ ...form, audienceNote: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Đang lưu…" : "Lưu mục tiêu"}</button>
          {g && <button className="btn-ghost" onClick={() => setEdit(false)}>Huỷ</button>}
        </div>
      </div>
    );
  }

  // Hiển thị mục tiêu + tiến độ. Chỉ tính % khi có follower THẬT.
  const ri = data.real.insights;
  const pct =
    ri && data.followers != null && g?.targetFollowers && g.targetFollowers > 0
      ? Math.min(100, Math.round((data.followers / g.targetFollowers) * 100))
      : null;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">🎯 Mục tiêu xây page</h2>
          {g?.audienceNote && <p className="text-sm text-gray-600 mt-0.5">Tệp: <b>{g.audienceNote}</b></p>}
        </div>
        <button className="btn-ghost text-sm" onClick={() => setEdit(true)}>✏️ Sửa</button>
      </div>

      {pct !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{fmt(data.followers!)} / {fmt(g!.targetFollowers!)} follower</span>
            <span className={`font-semibold ${p.onTrackFollowers ? "text-good" : "text-warm"}`}>{pct}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${p.onTrackFollowers ? "bg-good" : "bg-warm"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
            {g?.deadline && <MiniStat label="Hạn" value={g.deadline} />}
            {p.weeksToDeadline != null && <MiniStat label="Còn lại" value={`${p.weeksToDeadline} tuần`} />}
            {p.projectedFollowers != null && <MiniStat label="Dự phóng đúng hạn" value={fmt(p.projectedFollowers)} tone={p.onTrackFollowers ? "good" : "bad"} />}
            {p.neededFollowPerWeek != null && <MiniStat label="Cần/tuần" value={`+${fmt(p.neededFollowPerWeek)}`} tone={p.onTrackFollowers ? "good" : "bad"} />}
          </div>
        </div>
      )}
      {pct === null && (
        <p className="text-sm text-gray-500 mt-2">
          {g?.targetFollowers
            ? `Đích ${fmt(g.targetFollowers)} follower — kết nối & “Làm mới token trang” để xem tiến độ thật.`
            : "Chưa đặt đích follower. Bấm Sửa để đặt mục tiêu."}
        </p>
      )}
    </div>
  );
}

function WeekdayBars({ stats, best }: { stats: WeekdayStat[]; best?: number }) {
  const max = Math.max(1, ...stats.map((s) => s.avg));
  return (
    <div className="flex items-end gap-2 h-32 mb-4">
      {stats.map((s) => (
        <div key={s.weekday} className="flex-1 flex flex-col items-center justify-end h-full">
          <div className="text-[10px] text-gray-500 mb-0.5">{s.avg || ""}</div>
          <div
            className={`w-full rounded-t ${s.weekday === best ? "bg-brand" : "bg-gray-300"}`}
            style={{ height: `${(s.avg / max) * 100}%`, minHeight: s.avg > 0 ? 4 : 0 }}
            title={`${s.label}: ${s.posts} bài, TB ${s.avg} tương tác/bài`}
          />
          <div className="text-[10px] text-gray-500 mt-1">{s.label.replace("Thứ ", "T").replace("Chủ nhật", "CN")}</div>
        </div>
      ))}
    </div>
  );
}

function HourStrip({ stats, window }: { stats: HourStat[]; window?: { from: number; to: number } }) {
  const max = Math.max(1, ...stats.map((s) => s.engagement));
  const inWin = (h: number) => {
    if (!window) return false;
    if (window.from <= window.to) return h >= window.from && h <= window.to;
    return h >= window.from || h <= window.to;
  };
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">Tương tác theo giờ (0–23h, giờ VN)</div>
      <div className="flex items-end gap-[2px] h-16">
        {stats.map((s) => (
          <div
            key={s.hour}
            className={`flex-1 rounded-t ${inWin(s.hour) ? "bg-brand" : "bg-gray-200"}`}
            style={{ height: `${Math.max(2, (s.engagement / max) * 100)}%` }}
            title={`${s.hour}h: ${s.engagement} tương tác (${s.posts} bài)`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </div>
  );
}

function DemoTable({ title, rows }: { title: string; rows: DemoRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.pct));
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-400">Không có dữ liệu.</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-sm">
              <div className="w-28 shrink-0 truncate" title={r.label}>{r.label}</div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${(r.pct / max) * 100}%` }} />
              </div>
              <div className="w-12 text-right text-gray-500 text-xs">{r.pct}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FindingList({ items }: { items: Finding[] }) {
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

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "bad" | "warn" }) {
  const toneCls = { default: "text-gray-900", good: "text-good", bad: "text-junk", warn: "text-warm" }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${toneCls}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "bad" }) {
  const toneCls = { default: "text-gray-800", good: "text-good", bad: "text-junk" }[tone];
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" inputMode="numeric" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} />
    </div>
  );
}
