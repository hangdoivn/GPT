import { getConfig } from "@/lib/facebook/client";
import { resolveConfig, isConnected } from "@/lib/facebook/auth";
import { prisma } from "@/lib/db";
import { Suspense } from "react";
import { FacebookConnect } from "@/components/FacebookConnect";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cfg = await resolveConfig();
  const env = getConfig();
  const [connected, pages, leads, campaigns] = await Promise.all([
    isConnected(),
    prisma.page.count(),
    prisma.lead.count(),
    prisma.campaign.count(),
  ]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-sm text-gray-500">Kết nối Facebook bằng một cú đăng nhập, không cần dán token.</p>
      </div>

      <div className="card p-5">
        <Suspense fallback={<div className="text-sm text-gray-400">Đang tải…</div>}>
          <FacebookConnect />
        </Suspense>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Cấu hình đang dùng</h2>
        <div className="space-y-2">
          <Row label="Trạng thái" ok={connected} val={connected ? "Đã kết nối" : "Chưa kết nối"} />
          <Row label="App ID (.env)" ok={!!env.appId} val={env.appId ? mask(env.appId) : "chưa đặt"} />
          <Row label="App Secret (.env)" ok={!!env.appSecret} val={env.appSecret ? "••••••••" : "chưa đặt"} />
          <Row label="Page ID đang chọn" ok={!!cfg.pageId} val={cfg.pageId || "chưa có"} />
          <Row label="Ad Account" ok={!!cfg.adAccountId} val={cfg.adAccountId || "chưa có"} />
          <Row label="Graph API" ok val={env.graphVersion} />
        </div>
        <p className="text-xs text-gray-400 mt-3">
          App ID / Secret là thông tin cấp <b>app</b> (không đổi theo user) nên vẫn đặt trong{" "}
          <code>.env</code>. Token của page & ad account được lấy tự động qua đăng nhập ở trên.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Dữ liệu hiện có</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat label="Fanpage" n={pages} />
          <Stat label="Chiến dịch" n={campaigns} />
          <Stat label="Lead" n={leads} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-2">Ngưỡng chấm điểm lead</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex justify-between"><span>Điểm ≥ 70</span><span className="text-good font-medium">Chất lượng</span></div>
          <div className="flex justify-between"><span>40 – 69</span><span className="text-warm font-medium">Cần xác minh</span></div>
          <div className="flex justify-between"><span>&lt; 40</span><span className="text-junk font-medium">Rác</span></div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Quy tắc trừ điểm nằm ở <code>src/lib/scoring/index.ts</code>.
        </p>
      </div>
    </div>
  );
}

function Row({ label, ok, val }: { label: string; ok: boolean; val: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-gray-50 py-1.5">
      <span className="text-gray-600">{label}</span>
      <span className={`font-mono text-xs ${ok ? "text-gray-800" : "text-red-400"}`}>
        {ok ? "✓ " : "✗ "}
        {val}
      </span>
    </div>
  );
}

function Stat({ label, n }: { label: string; n: number }) {
  return (
    <div>
      <div className="text-2xl font-bold">{n}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function mask(s: string): string {
  if (s.length <= 4) return s;
  return s.slice(0, 4) + "•••" + s.slice(-2);
}
