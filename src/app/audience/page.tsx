"use client";

import { useEffect, useState } from "react";

interface Finding {
  sentiment: "good" | "warn" | "bad" | "info";
  title: string;
  detail: string;
}
interface BucketStat {
  bucket: "broad" | "core" | "engager";
  label: string;
  total: number;
  junk: number;
  junkRate: number;
  wonRate: number;
}
interface Evaluation {
  score: number;
  band: "healthy" | "warning" | "polluted";
  pillars: { leadPurity: number; adRelevance: number; organicVitality: number; growthRetention: number };
  verdict: "keep_page" | "fix_ads" | "clean_audience" | "new_page";
  verdictTitle: string;
  verdictReason: string;
  redLine: boolean;
  redLineReason?: string;
  diagnosis: { broadJunk: number | null; sourceFloor: number | null; targetingExcess: number | null; matrix: string };
  signals: Finding[];
  confidence: "low" | "medium" | "high";
}
interface Data {
  source: "facebook" | "demo";
  note: string | null;
  followers: number;
  buckets: BucketStat[];
  evaluation: Evaluation;
}

const VERDICT_STYLE: Record<string, { bg: string; ring: string; emoji: string }> = {
  keep_page: { bg: "bg-green-50", ring: "border-good", emoji: "✅" },
  fix_ads: { bg: "bg-blue-50", ring: "border-brand", emoji: "🎯" },
  clean_audience: { bg: "bg-amber-50", ring: "border-warm", emoji: "🧹" },
  new_page: { bg: "bg-red-50", ring: "border-junk", emoji: "🆕" },
};
const BAND_COLOR: Record<string, string> = { healthy: "text-good", warning: "text-warm", polluted: "text-junk" };
const BAND_LABEL: Record<string, string> = { healthy: "KHOẺ", warning: "CHỚM Ô NHIỄM", polluted: "Ô NHIỄM NẶNG" };
const SENTIMENT: Record<string, { cls: string; icon: string }> = {
  good: { cls: "border-l-good bg-green-50", icon: "✅" },
  warn: { cls: "border-l-warm bg-amber-50", icon: "⚠️" },
  bad: { cls: "border-l-junk bg-red-50", icon: "🔻" },
  info: { cls: "border-l-brand bg-blue-50", icon: "💡" },
};

function junkCls(rate: number) {
  return rate > 40 ? "text-junk" : rate > 20 ? "text-warm" : "text-good";
}

export default function AudiencePage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audience")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Đang đánh giá tệp người xem…</div>;
  if (!data) return <div className="text-junk">Không tải được đánh giá.</div>;

  const e = data.evaluation;
  const vs = VERDICT_STYLE[e.verdict];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Đánh giá tệp người xem — Hàng Đôi</h1>
          <p className="text-sm text-gray-500">Nên tạo page mới hay giữ page cũ? Chẩn đoán rác do ads hay do tệp page.</p>
        </div>
        <span className={`badge ${data.source === "facebook" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {data.source === "facebook" ? "● Dữ liệu Facebook thật" : "○ Dữ liệu mẫu (chưa kết nối)"}
        </span>
      </div>

      {/* PHÁN QUYẾT + ĐIỂM */}
      <div className={`card border-2 ${vs.ring} ${vs.bg} p-5`}>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="text-center shrink-0">
            <div className={`text-5xl font-extrabold ${BAND_COLOR[e.band]}`}>{e.score}</div>
            <div className="text-xs text-gray-500">/ 100 điểm sức khoẻ</div>
            <div className={`text-xs font-semibold mt-0.5 ${BAND_COLOR[e.band]}`}>{BAND_LABEL[e.band]}</div>
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="text-lg font-bold">
              {vs.emoji} Phán quyết: {e.verdictTitle}
            </div>
            <p className="text-sm text-gray-700 mt-1">{e.verdictReason}</p>
            <div className="text-xs text-gray-400 mt-2">
              Độ tin cậy: {e.confidence === "high" ? "cao" : e.confidence === "medium" ? "trung bình" : "thấp (mẫu nhỏ)"}
            </div>
          </div>
        </div>
        {e.redLine && (
          <div className="mt-3 text-sm text-red-700 bg-red-100 rounded-lg px-3 py-2">🚨 Cờ đỏ: {e.redLineReason}</div>
        )}
      </div>

      {/* 4 TRỤ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Pillar label="Thuần lead (35%)" value={e.pillars.leadPurity} />
        <Pillar label="Relevance ads (25%)" value={e.pillars.adRelevance} />
        <Pillar label="Sinh lực organic (20%)" value={e.pillars.organicVitality} />
        <Pillar label="Tăng trưởng & giữ chân (20%)" value={e.pillars.growthRetention} />
      </div>

      {/* MA TRẬN ADS vs PAGE */}
      <div className="card p-4">
        <h2 className="font-semibold mb-1">Chẩn đoán: rác do ADS hay do TỆP PAGE?</h2>
        <p className="text-sm text-gray-500 mb-3">
          So tỉ lệ rác của tệp broad (soi cách nhắm) với tệp lõi lookalike/retarget (soi DNA page).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Nhóm targeting</th>
                <th className="text-right px-3 py-2">Lead</th>
                <th className="text-right px-3 py-2">Rác</th>
                <th className="text-right px-3 py-2">Tỉ lệ rác</th>
                <th className="text-right px-3 py-2">Tỉ lệ chốt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.buckets.map((b) => (
                <tr key={b.bucket}>
                  <td className="px-3 py-2 font-medium">{b.label}</td>
                  <td className="px-3 py-2 text-right">{b.total}</td>
                  <td className="px-3 py-2 text-right text-junk">{b.junk}</td>
                  <td className={`px-3 py-2 text-right font-bold ${junkCls(b.junkRate)}`}>{b.junkRate}%</td>
                  <td className="px-3 py-2 text-right text-good">{b.wonRate}%</td>
                </tr>
              ))}
              {data.buckets.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-3 text-gray-400 text-sm">Chưa có chiến dịch để phân nhóm.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {e.diagnosis.sourceFloor !== null && (
          <div className="text-xs text-gray-500 mt-2">
            Sàn rác tệp lõi: <b>{e.diagnosis.sourceFloor}%</b> · Chênh do broad:{" "}
            <b>{e.diagnosis.targetingExcess ?? "—"}%</b>
          </div>
        )}
        <div className="mt-3 border-l-4 border-l-brand bg-blue-50 rounded-r-lg px-4 py-2.5 text-sm">
          <b>Kết luận:</b> {e.diagnosis.matrix}
        </div>
      </div>

      {/* TÍN HIỆU */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Tín hiệu chi tiết</h2>
        <div className="space-y-2">
          {e.signals.map((f, i) => {
            const s = SENTIMENT[f.sentiment] ?? SENTIMENT.info;
            return (
              <div key={i} className={`border-l-4 rounded-r-lg px-4 py-2.5 ${s.cls}`}>
                <div className="font-medium text-sm">{s.icon} {f.title}</div>
                <div className="text-sm text-gray-600 mt-0.5">{f.detail}</div>
              </div>
            );
          })}
        </div>
      </div>

      {data.note && <div className="card p-3 text-sm text-amber-700 bg-amber-50">{data.note}</div>}

      <div className="card p-4 text-xs text-gray-500 space-y-1">
        <div className="font-semibold text-gray-600">Lưu ý phương pháp</div>
        <p>• Facebook đã <b>gỡ nhân khẩu follower organic</b> (tuổi/giới/quốc gia) từ 2024 — tuổi/giới/vùng chỉ suy được qua Ads breakdown khi đang chạy ads; địa lý khách suy từ tỉnh/thành trong lead.</p>
        <p>• Ngưỡng là <b>heuristic khởi đầu</b> — nên hiệu chỉnh bằng baseline 1–2 tháng của chính Hàng Đôi. Ngành áo đôi mùa vụ mạnh (Tết/Valentine) làm số dao động; <b>tránh quyết định bỏ page ngay sau một đợt trũng mùa vụ</b>, chỉ dùng điểm thấp DAI DẲNG.</p>
        <p>• Switch cost thường thấp hơn tưởng: page mới cùng Business Manager giữ pixel/ad account/CRM/lookalike-từ-khách-mua, chỉ mất lớp xã hội (tuổi page, follower, review).</p>
      </div>
    </div>
  );
}

function Pillar({ label, value }: { label: string; value: number }) {
  const color = value >= 67 ? "bg-good" : value >= 40 ? "bg-warm" : "bg-junk";
  return (
    <div className="card p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
