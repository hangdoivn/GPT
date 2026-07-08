"use client";

import { useState } from "react";

interface Finding { sentiment: "good" | "warn" | "bad" | "info"; title: string; detail: string }
interface ConvResult { id: string; name: string; risk: number; reasons: string[] }
interface Report {
  total: number;
  suspectCount: number;
  suspectRate: number;
  band: "clean" | "mixed" | "injected";
  verdict: string;
  signalCounts: { noName: number; oneAndGone: number; tooShort: number; noPhone: number };
  dupClusters: { text: string; count: number }[];
  burst: { maxInWindow: number; windowMin: number };
  evidence: string[];
  findings: Finding[];
  conversations: ConvResult[];
}

const SENTIMENT: Record<string, { cls: string; icon: string }> = {
  good: { cls: "border-l-good bg-green-50", icon: "✅" },
  warn: { cls: "border-l-warm bg-amber-50", icon: "⚠️" },
  bad: { cls: "border-l-junk bg-red-50", icon: "🔻" },
  info: { cls: "border-l-brand bg-blue-50", icon: "💡" },
};
const BAND: Record<string, { cls: string; label: string }> = {
  clean: { cls: "bg-green-100 text-green-700", label: "Chủ yếu thật" },
  mixed: { cls: "bg-amber-100 text-amber-700", label: "Hỗn hợp" },
  injected: { cls: "bg-red-100 text-red-700", label: "Dấu hiệu bơm ảo" },
};

export default function FakeLeadsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function scan() {
    setLoading(true);
    setErr(null);
    setReport(null);
    try {
      const res = await fetch("/api/fake-leads");
      const data = await res.json();
      if (data.report) setReport(data.report);
      else setErr(data.error ?? "Không quét được.");
    } catch {
      setErr("Lỗi mạng khi quét.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Phát hiện lead ảo</h1>
          <p className="text-sm text-gray-500">Soi hội thoại Messenger tìm nick bơm để đủ số lượng mess (Meta/đối tác chạy). Cho bằng chứng để đối chất.</p>
        </div>
        <button className="btn-primary" onClick={scan} disabled={loading}>{loading ? "⏳ Đang quét…" : "🔍 Quét ngay"}</button>
      </div>

      {err && <div className="card p-3 text-sm text-junk bg-red-50">{err}</div>}

      {!report && !err && !loading && (
        <div className="card p-8 text-center text-gray-400">
          Bấm <b>Quét ngay</b> để phân tích hội thoại Messenger gần nhất và chấm dấu hiệu nick ảo.
        </div>
      )}

      {report && (
        <>
          {/* Tổng quan */}
          <div className="card p-5">
            <div className="flex items-center gap-5 flex-wrap">
              <div className={`w-24 h-24 rounded-full border-4 ${report.band === "injected" ? "border-junk" : report.band === "mixed" ? "border-warm" : "border-good"} flex flex-col items-center justify-center shrink-0`}>
                <div className={`text-2xl font-bold ${report.band === "injected" ? "text-junk" : report.band === "mixed" ? "text-warm" : "text-good"}`}>{report.suspectRate}%</div>
                <div className="text-[10px] text-gray-400">nghi ảo</div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <span className={`badge ${BAND[report.band].cls}`}>● {BAND[report.band].label}</span>
                <p className="text-sm text-gray-700 mt-2">{report.verdict}</p>
                <p className="text-xs text-gray-400 mt-1">Đã quét {report.total} hội thoại · {report.suspectCount} đáng ngờ.</p>
              </div>
            </div>
          </div>

          {/* Bằng chứng */}
          {report.evidence.length > 0 && (
            <div className="card p-4">
              <h2 className="font-semibold mb-2">🧾 Bằng chứng (chụp để đối chất Meta/đối tác)</h2>
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                {report.evidence.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Dấu hiệu */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Sig label="Nhắn 1 câu rồi im" n={report.signalCounts.oneAndGone} total={report.total} />
            <Sig label="Tên không phân giải" n={report.signalCounts.noName} total={report.total} />
            <Sig label="Tin quá ngắn" n={report.signalCounts.tooShort} total={report.total} />
            <Sig label="Không để SĐT" n={report.signalCounts.noPhone} total={report.total} />
          </div>

          <div className="card p-4">
            <FindingList items={report.findings} />
          </div>

          {/* Nhóm trùng */}
          {report.dupClusters.length > 0 && (
            <div className="card p-4">
              <h2 className="font-semibold mb-2">🔁 Câu nhắn bị lặp (kịch bản bơm)</h2>
              <div className="space-y-1.5">
                {report.dupClusters.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="badge bg-red-100 text-red-700 shrink-0">×{d.count}</span>
                    <span className="text-gray-700 truncate">&quot;{d.text}&quot;</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hội thoại nghi ngờ */}
          {report.conversations.some((c) => c.risk >= 50) && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 font-semibold">Hội thoại nghi ngờ cao</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr><th className="text-left px-4 py-2">Khách</th><th className="text-center px-4 py-2">Điểm nghi</th><th className="text-left px-4 py-2">Dấu hiệu</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.conversations.filter((c) => c.risk >= 50).slice(0, 30).map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{c.name}</td>
                        <td className="px-4 py-2 text-center font-bold text-junk">{c.risk}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{c.reasons.join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card p-3 text-xs text-gray-500 bg-blue-50">
            💡 <b>Cách dùng bằng chứng:</b> nếu tỉ lệ nghi ảo cao + có câu trùng/mẻ dồn → gửi ảnh này cho đối tác chạy ads yêu cầu giải trình, hoặc report chất lượng lead lên Meta. Đồng thời đổi tối ưu ads sang <b>lead có SĐT/conversion</b> thay vì “messaging”, và thêm câu hỏi lọc bắt buộc.
          </div>
        </>
      )}
    </div>
  );
}

function Sig({ label, n, total }: { label: string; n: number; total: number }) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  const tone = pct >= 50 ? "text-junk" : pct >= 25 ? "text-warm" : "text-gray-900";
  return (
    <div className="card p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${tone}`}>{pct}%</div>
      <div className="text-[11px] text-gray-400">{n}/{total}</div>
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
