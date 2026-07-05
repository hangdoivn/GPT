"use client";

import { useEffect, useState, useCallback } from "react";

interface Config {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncAt: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  intervalOptions: number[];
}

function intervalLabel(m: number): string {
  if (m < 60) return `${m} phút`;
  if (m < 1440) return `${m / 60} giờ`;
  return `${m / 1440} ngày`;
}

export function SyncSettings() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const c = await fetch("/api/sync/config").then((r) => r.json());
    setCfg(c);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: { enabled?: boolean; intervalMinutes?: number }) {
    setBusy(true);
    const c = await fetch("/api/sync/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => r.json());
    setCfg(c);
    setBusy(false);
  }

  if (!cfg) return <div className="text-sm text-gray-400">Đang tải…</div>;

  const statusColor =
    cfg.lastStatus === "ok" ? "text-good" : cfg.lastStatus === "error" ? "text-junk" : "text-gray-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Đồng bộ định kỳ</h2>
        <button
          role="switch"
          aria-checked={cfg.enabled}
          disabled={busy}
          onClick={() => save({ enabled: !cfg.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            cfg.enabled ? "bg-brand" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              cfg.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Tự động kéo lead & chiến dịch mới từ Facebook, không cần bấm tay.
      </p>

      <div>
        <label className="label">Chu kỳ</label>
        <div className="flex flex-wrap gap-1.5">
          {cfg.intervalOptions.map((m) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => save({ intervalMinutes: m })}
              className={`badge border px-3 py-1 ${
                cfg.intervalMinutes === m
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {intervalLabel(m)}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm border-t border-gray-100 pt-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Lần đồng bộ gần nhất</span>
          <span className="text-gray-800">
            {cfg.lastSyncAt ? new Date(cfg.lastSyncAt).toLocaleString("vi-VN") : "chưa chạy"}
          </span>
        </div>
        {cfg.lastMessage && (
          <div className="flex justify-between mt-1">
            <span className="text-gray-500">Kết quả</span>
            <span className={statusColor}>{cfg.lastMessage}</span>
          </div>
        )}
        {cfg.enabled && (
          <div className="text-xs text-gray-400 mt-2">
            ● Đang bật — chạy mỗi {intervalLabel(cfg.intervalMinutes)}. (Cần server chạy liên tục;
            nếu deploy serverless, dùng cron gọi <code>/api/cron/sync</code>.)
          </div>
        )}
      </div>
    </div>
  );
}
