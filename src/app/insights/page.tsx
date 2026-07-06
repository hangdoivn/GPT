"use client";

import { useEffect, useState } from "react";
import { ReachChart, PostsChart } from "@/components/InsightsCharts";

interface Finding {
  sentiment: "good" | "warn" | "bad" | "info";
  title: string;
  detail: string;
}
interface PostStat {
  id: string;
  date: string;
  message: string;
  reactions: number;
  comments: number;
  shares: number;
  engagement: number;
}
interface Data {
  connected: boolean;
  activePageId: string | null;
  postsSource: "facebook" | "demo";
  postsNote: string | null;
  followers: number;
  posts: {
    totalPosts: number;
    totalReactions: number;
    totalComments: number;
    totalShares: number;
    avgEngagement: number;
    cadencePerWeek: number;
    bestPost?: PostStat;
    posts: PostStat[];
    findings: Finding[];
  };
  pageSource: "facebook" | "demo";
  note: string | null;
  series: { date: string; reach: number; engagement: number; follows: number }[];
  analysis: { findings: Finding[] };
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
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Đang phân tích insight…</div>;
  if (!data) return <div className="text-junk">Không tải được insight.</div>;

  const p = data.posts;
  const postBars = p.posts.map((x) => ({
    label: x.date.slice(5),
    reactions: x.reactions,
    comments: x.comments,
    shares: x.shares,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Insights Page — Hàng Đôi</h1>
          <p className="text-sm text-gray-500">Hiệu quả bài đăng & sức khoẻ fanpage 28 ngày gần nhất.</p>
        </div>
        <span className={`badge ${data.postsSource === "facebook" ? "bg-green-100 text-green-700" : data.connected ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
          {data.postsSource === "facebook"
            ? "● Bài đăng: Facebook thật"
            : data.connected
              ? "● Đã kết nối · số minh hoạ"
              : "○ Chưa kết nối"}
        </span>
      </div>

      {data.postsSource === "demo" && data.postsNote && (
        <div className="card p-3 text-sm text-amber-800 bg-amber-50 border-l-4 border-l-warm">
          ⚠️ {data.postsNote}
        </div>
      )}

      {/* Chỉ số bài đăng (THẬT) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Follower" value={fmt(data.followers)} />
        <Stat label="Số bài (28N)" value={fmt(p.totalPosts)} sub={`${p.cadencePerWeek} bài/tuần`} tone={p.cadencePerWeek >= 2 ? "good" : "warn"} />
        <Stat label="Tương tác TB/bài" value={fmt(p.avgEngagement)} tone={p.avgEngagement >= 10 ? "good" : "warn"} />
        <Stat label="Tổng bình luận" value={fmt(p.totalComments)} />
        <Stat label="Tổng chia sẻ" value={fmt(p.totalShares)} tone="good" />
      </div>

      {/* Biểu đồ tương tác từng bài */}
      <div className="card p-4">
        <h2 className="font-semibold mb-1">Tương tác theo từng bài đăng</h2>
        <p className="text-xs text-gray-500 mb-2">Xanh dương = cảm xúc · xanh lá = bình luận · cam = chia sẻ</p>
        <PostsChart data={postBars} />
      </div>

      {/* Nhận định từ bài đăng (THẬT) */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">🔎 Nhận định & khuyến nghị (từ bài đăng thật)</h2>
        <div className="space-y-2">
          {p.findings.map((f, i) => {
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

      {/* Bài đăng gần đây */}
      {p.posts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold">Bài đăng gần đây</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Ngày</th>
                  <th className="text-left px-4 py-2">Nội dung</th>
                  <th className="text-right px-4 py-2">❤️</th>
                  <th className="text-right px-4 py-2">💬</th>
                  <th className="text-right px-4 py-2">🔁</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...p.posts].reverse().slice(0, 12).map((x) => (
                  <tr key={x.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{x.date}</td>
                    <td className="px-4 py-2 max-w-md truncate">{x.message || "(bài không chữ)"}</td>
                    <td className="px-4 py-2 text-right">{fmt(x.reactions)}</td>
                    <td className="px-4 py-2 text-right">{fmt(x.comments)}</td>
                    <td className="px-4 py-2 text-right">{fmt(x.shares)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tiếp cận/Follow — cần read_insights (thường minh hoạ) */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Tiếp cận theo ngày</h2>
          <span className={`badge ${data.pageSource === "facebook" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {data.pageSource === "facebook" ? "● Facebook thật" : "○ Số minh hoạ"}
          </span>
        </div>
        {data.note && <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2">{data.note}</div>}
        <ReachChart data={data.series} />
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
  const toneCls = { default: "text-gray-900", good: "text-good", bad: "text-junk", warn: "text-warm" }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${toneCls}`}>{sub}</div>}
    </div>
  );
}
