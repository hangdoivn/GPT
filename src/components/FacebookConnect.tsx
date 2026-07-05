"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Status {
  connected: boolean;
  hasAppCreds: boolean;
  hasAdAccount: boolean;
  pageId: string | null;
  connectedName: string | null;
}

interface PageItem {
  fbPageId: string;
  name: string;
  followers: number;
}

export function FacebookConnect() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([
      fetch("/api/status").then((r) => r.json()),
      fetch("/api/facebook/pages").then((r) => r.json()),
    ]);
    setStatus(s);
    setPages(p.pages ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function disconnect() {
    setBusy(true);
    await fetch("/api/auth/facebook/disconnect", { method: "POST" });
    await load();
    setBusy(false);
    router.refresh();
  }

  async function selectPage(fbPageId: string) {
    setBusy(true);
    await fetch("/api/facebook/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fbPageId }),
    });
    await load();
    setBusy(false);
    router.refresh();
  }

  const error = params.get("error");
  const justConnected = params.get("connected") === "1";

  if (!status) return <div className="text-sm text-gray-400">Đang tải…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Kết nối Facebook</h2>
        <span className={`badge ${status.connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {status.connected ? "● Đã kết nối" : "○ Chưa kết nối"}
        </span>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
          {error === "no_app_creds"
            ? "Chưa cấu hình FACEBOOK_APP_ID / FACEBOOK_APP_SECRET trong .env — cần app credentials để đăng nhập."
            : error === "state_mismatch"
              ? "Phiên đăng nhập không hợp lệ, thử lại."
              : `Lỗi khi kết nối: ${error}`}
        </div>
      )}
      {justConnected && !error && (
        <div className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
          ✓ Đã kết nối{status.connectedName ? ` với ${status.connectedName}` : ""}. Lấy được {pages.length} page.
        </div>
      )}

      {!status.connected ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Đăng nhập Facebook một lần, app sẽ tự lấy token dài hạn, danh sách page và ad account —
            không cần dán token thủ công.
          </p>
          {!status.hasAppCreds && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
              ⚠️ Cần điền <code>FACEBOOK_APP_ID</code> và <code>FACEBOOK_APP_SECRET</code> vào{" "}
              <code>.env</code> trước (đây là thông tin của <b>app</b>, lấy ở
              developers.facebook.com), rồi khởi động lại.
            </p>
          )}
          <a
            href="/api/auth/facebook/login"
            className={`btn-primary ${!status.hasAppCreds ? "pointer-events-none opacity-50" : ""}`}
          >
            <span>🔗</span> Đăng nhập với Facebook
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Tài khoản: <b>{status.connectedName ?? "—"}</b>
            {status.hasAdAccount ? " · Đã liên kết ad account" : " · Chưa có ad account"}
          </div>

          {pages.length > 0 && (
            <div>
              <div className="label">Page đang quản lý</div>
              <div className="space-y-1.5">
                {pages.map((p) => {
                  const active = p.fbPageId === status.pageId;
                  return (
                    <button
                      key={p.fbPageId}
                      disabled={busy}
                      onClick={() => selectPage(p.fbPageId)}
                      className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                        active ? "border-brand bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-gray-400">
                        {active ? "● đang chọn" : `${p.followers.toLocaleString("vi-VN")} follow`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button className="btn-ghost text-red-600" disabled={busy} onClick={disconnect}>
            Ngắt kết nối
          </button>
        </div>
      )}
    </div>
  );
}
