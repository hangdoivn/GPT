"use client";

import { useState } from "react";

// Nút lấy lại page token mới từ user token (fix #10 khi token trang cũ thiếu quyền).
export function RefreshTokensButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/facebook/refresh-tokens", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg(`✓ Đã làm mới token cho ${data.updated} trang. Mở lại Insights Page để kiểm tra.`);
      } else {
        setMsg(data.error ?? "Làm mới lỗi.");
      }
    } catch {
      setMsg("Làm mới lỗi mạng.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-3">
      <button className="btn-ghost text-sm" onClick={run} disabled={busy}>
        {busy ? "⏳ Đang làm mới…" : "🔄 Làm mới token trang"}
      </button>
      {msg && <div className="text-xs text-gray-600 mt-2">{msg}</div>}
    </div>
  );
}
