"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QualityBadge } from "@/components/ui";

interface Lead {
  id: string;
  fullName: string;
  phone: string | null;
  province: string | null;
  quality: string;
  crmStatus: string;
}

const COLUMNS = [
  { key: "new", label: "Mới", color: "border-t-blue-400" },
  { key: "contacted", label: "Đã liên hệ", color: "border-t-indigo-400" },
  { key: "qualified", label: "Tiềm năng", color: "border-t-purple-400" },
  { key: "won", label: "Chốt đơn", color: "border-t-green-500" },
  { key: "lost", label: "Mất", color: "border-t-gray-400" },
];

const ORDER = COLUMNS.map((c) => c.key);

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    // CRM chỉ quan tâm lead không phải rác cho gọn — nhưng vẫn cho xem tất.
    const res = await fetch("/api/leads");
    setLeads(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Mở (hoặc tạo nếu chưa có) dự án cho lead đã chốt deal. Idempotent ở API.
  async function openProject(lead: Lead) {
    setOpening(lead.id);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromLeadId: lead.id }),
    });
    setOpening(null);
    if (res.ok) {
      const data = await res.json();
      if (data.project?.id) router.push(`/projects/${data.project.id}`);
    }
  }

  async function move(lead: Lead, dir: 1 | -1) {
    const idx = ORDER.indexOf(lead.crmStatus);
    const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, idx + dir))];
    if (next === lead.crmStatus) return;
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crmStatus: next }),
    });
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">CRM chăm khách</h1>
        <p className="text-sm text-gray-500">Kéo lead qua từng bước bằng nút ◀ ▶. Lead rác đã được đánh dấu để bạn bỏ qua.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const items = leads.filter((l) => l.crmStatus === col.key);
          return (
            <div key={col.key} className={`card border-t-4 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{col.label}</span>
                <span className="badge bg-gray-100 text-gray-500">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((l) => (
                  <div key={l.id} className="rounded-lg border border-gray-200 p-2.5 bg-white">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm truncate">{l.fullName}</span>
                      <QualityBadge quality={l.quality} />
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{l.phone ?? "—"}</div>
                    {col.key === "won" && (
                      <button
                        className="btn-ghost text-xs w-full mt-2 justify-center"
                        onClick={() => openProject(l)}
                        disabled={opening === l.id}
                      >
                        {opening === l.id ? "Đang mở…" : "📁 Dự án"}
                      </button>
                    )}
                    <div className="flex justify-between mt-2">
                      <button className="text-xs text-gray-400 hover:text-brand" onClick={() => move(l, -1)}>◀</button>
                      <button className="text-xs text-gray-400 hover:text-brand" onClick={() => move(l, 1)}>▶</button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="text-xs text-gray-300 text-center py-3">trống</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
