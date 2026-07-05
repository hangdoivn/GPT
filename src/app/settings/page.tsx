import { isConfigured, getConfig } from "@/lib/facebook/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cfg = getConfig();
  const connected = isConfigured();
  const [pages, leads, campaigns] = await Promise.all([
    prisma.page.count(),
    prisma.lead.count(),
    prisma.campaign.count(),
  ]);

  const rows = [
    { label: "App ID", ok: !!cfg.appId, val: cfg.appId ? mask(cfg.appId) : "chưa đặt" },
    { label: "App Secret", ok: !!cfg.appSecret, val: cfg.appSecret ? "••••••••" : "chưa đặt" },
    { label: "Page Access Token", ok: !!cfg.pageAccessToken, val: cfg.pageAccessToken ? "••••••••" : "chưa đặt" },
    { label: "Page ID", ok: !!cfg.pageId, val: cfg.pageId || "chưa đặt" },
    { label: "Ad Account ID", ok: !!cfg.adAccountId, val: cfg.adAccountId || "chưa đặt" },
    { label: "Graph API", ok: true, val: cfg.graphVersion },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-sm text-gray-500">Kết nối Facebook và xem cấu hình chấm điểm.</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Kết nối Facebook</h2>
          <span className={`badge ${connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {connected ? "● Đã kết nối" : "○ Chưa kết nối"}
          </span>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm border-b border-gray-50 py-1.5">
              <span className="text-gray-600">{r.label}</span>
              <span className={`font-mono text-xs ${r.ok ? "text-gray-800" : "text-red-400"}`}>
                {r.ok ? "✓ " : "✗ "}
                {r.val}
              </span>
            </div>
          ))}
        </div>
        {!connected && (
          <div className="mt-4 text-sm text-gray-600 bg-blue-50 rounded-lg p-3 space-y-1">
            <p className="font-medium">Cách kết nối:</p>
            <ol className="list-decimal pl-5 space-y-0.5 text-gray-600">
              <li>Tạo app tại developers.facebook.com, thêm sản phẩm Marketing API & Webhooks.</li>
              <li>Xin quyền: <code className="text-xs">leads_retrieval, ads_read, pages_manage_posts, pages_read_engagement</code>.</li>
              <li>Lấy Page Access Token dài hạn qua Graph API Explorer.</li>
              <li>Điền các giá trị vào file <code className="text-xs">.env</code> rồi khởi động lại app.</li>
            </ol>
          </div>
        )}
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
          Quy tắc trừ điểm nằm ở <code>src/lib/scoring/index.ts</code> — chỉnh mức phạt / thêm từ khoá
          spam / đầu số nhà mạng tại đó.
        </p>
      </div>
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
