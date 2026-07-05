"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Toolbar() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(path: string, label: string) {
    setBusy(label);
    setMsg(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi");
      setMsg(data.message ?? `${label} xong.`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button className="btn-primary" disabled={!!busy} onClick={() => call("/api/sync", "Đồng bộ")}>
        {busy === "Đồng bộ" ? "Đang đồng bộ…" : "🔄 Đồng bộ Facebook"}
      </button>
      <button className="btn-ghost" disabled={!!busy} onClick={() => call("/api/demo", "Nạp demo")}>
        {busy === "Nạp demo" ? "Đang nạp…" : "🧪 Nạp dữ liệu demo"}
      </button>
      {msg && <span className="text-sm text-gray-600">{msg}</span>}
    </div>
  );
}
