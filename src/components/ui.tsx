"use client";

export function QualityBadge({ quality }: { quality: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    good: { cls: "bg-green-100 text-green-700", label: "Chất lượng" },
    warm: { cls: "bg-amber-100 text-amber-700", label: "Cần xác minh" },
    junk: { cls: "bg-red-100 text-red-700", label: "Rác" },
    unscored: { cls: "bg-gray-100 text-gray-500", label: "Chưa chấm" },
  };
  const m = map[quality] ?? map.unscored;
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export function CrmBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    new: { cls: "bg-blue-100 text-blue-700", label: "Mới" },
    contacted: { cls: "bg-indigo-100 text-indigo-700", label: "Đã liên hệ" },
    qualified: { cls: "bg-purple-100 text-purple-700", label: "Tiềm năng" },
    won: { cls: "bg-green-100 text-green-700", label: "Chốt đơn" },
    lost: { cls: "bg-gray-200 text-gray-600", label: "Mất" },
  };
  const m = map[status] ?? map.new;
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "good" | "junk" | "warm";
}) {
  const toneCls = {
    default: "text-gray-900",
    good: "text-good",
    junk: "text-junk",
    warm: "text-warm",
  }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// fmtVnd đã chuyển sang @/lib/format để server component dùng được. Re-export cho
// các client component đang import từ đây.
export { fmtVnd } from "@/lib/format";
