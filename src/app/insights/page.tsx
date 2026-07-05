"use client";

import { useEffect, useState } from "react";
import { ReachChart, FollowChart } from "@/components/InsightsCharts";

interface Finding {
  sentiment: "good" | "warn" | "bad" | "info";
  title: string;
  detail: string;
}

interface Data {
  source: "facebook" | "demo";
  note: string | null;
  fans: number;
  series: { date: string; reach: number; engagement: number; fanAdds: number }[];
  analysis: {
    metric: {
      reachTotal: number;
      reachChangePct: number;
      engagementRate: number;
      fanAddsNet: number;
      viewsTotal: number;
      fans: number;
    };
    findings: Finding[];
  };
}

const SENTIMENT: Record<string, { cls: string; icon: string }> = {
  good: { cls: "border-l-good bg-green-50", icon: "✅" },
  warn: { cls: "border-l-warm bg-amber-50", icon: "⚠️" },
  bad: { cls: "border-l-junk bg-red-50", icon: "🔻" },
  info: { cls: "border-l-brand bg-blue-50", icon: "💡" },
};

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

export default function InsightsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Đang phân tích insight…</div>;
  if (!data) return <div className="text-junk">Không tải được insight.</div>;

  const m = data.analysis.metric;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Insights Page — Hàng Đôi</h1>
          <p className="text-sm text-gray-500">Phân tích tự động sức khoẻ fanpage 28 ngày gần nhất.</p>
        </div>
        <span className={`badge ${data.source === "facebook" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {data.source === "facebook" ? "● Dữ liệu Facebook thật" : "○ Dữ liệu mẫu (chưa kết nối)"}
        </span>
      </div>

      {data.note && <div className="card p-3 text-sm text-amber-700 bg-amber-50">{data.note}</div>}

      {/* Chỉ số tổng hợp */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Follower" value={fmt(m.fans)} />
        <Stat
          label="Tiếp cận 28N"
          value={fmt(m.reachTotal)}
          sub={`${m.reachChangePct >= 0 ? "▲" : "▼"} ${Math.abs(m.reachChangePct)}%`}
          tone={m.reachChangePct >= 0 ? "good" : "bad"}
        />
        <Stat label="Tỉ lệ tương tác" value={`${m.engagementRate}%`} tone={m.engagementRate >= 3 ? "good" : "warn"} />
        <Stat label="Follow mới (ròng)" value={fmt(m.fanAddsNet)} tone={m.fanAddsNet >= 0 ? "good" : "bad"} />
        <Stat label="Lượt xem page" value={fmt(m.viewsTotal)} />
      </div>

      {/* Biểu đồ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Tiếp cận theo ngày</h2>
          <ReachChart data={data.series} />
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Follow mới theo ngày</h2>
          <FollowChart data={data.series} />
        </div>
      </div>

      {/* Phân tích tự động */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">🔎 Nhận định & khuyến nghị</h2>
        <div className="space-y-2">
          {data.analysis.findings.map((f, i) => {
            const s = SENTIMENT[f.sentiment] ?? SENTIMENT.info;
            return (
              <div key={i} className={`border-l-4 rounded-r-lg px-4 py-2.5 ${s.cls}`}>
                <div className="font-medium text-sm">
                  {s.icon} {f.title}
                </div>
                <div className="text-sm text-gray-600 mt-0.5">{f.detail}</div>
              </div>
            );
          })}
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
  value: string;
  sub?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneCls = { default: "text-gray-900", good: "text-good", bad: "text-junk", warm: "text-warm", warn: "text-warm" }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${toneCls}`}>{sub}</div>}
    </div>
  );
}
