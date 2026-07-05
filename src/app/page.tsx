import { getOverview, getCampaignQuality } from "@/lib/analytics";
import { StatCard } from "@/components/ui";
import { fmtVnd } from "@/lib/format";
import { Toolbar } from "@/components/Toolbar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [ov, campaigns] = await Promise.all([getOverview(), getCampaignQuality()]);
  const empty = ov.totalLeads === 0;
  const worst = campaigns.filter((c) => c.total >= 3).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Tổng quan</h1>
          <p className="text-sm text-gray-500">Sức khoẻ lead & hiệu quả quảng cáo của fanpage</p>
        </div>
        <Toolbar />
      </div>

      {empty ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-2">🎯</div>
          <div className="font-semibold text-lg">Chưa có dữ liệu</div>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Bấm <b>Đồng bộ Facebook</b> để kéo lead & chiến dịch về, hoặc <b>Nạp dữ liệu demo</b> để
            xem thử cách app phát hiện tệp rác.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Tổng lead" value={ov.totalLeads} sub={`${ov.activeCampaigns} chiến dịch đang chạy`} />
            <StatCard label="Lead chất lượng" value={ov.goodLeads} tone="good" sub={`${ov.warmLeads} cần xác minh`} />
            <StatCard
              label="Tỉ lệ rác"
              value={`${ov.junkRate}%`}
              tone={ov.junkRate > 30 ? "junk" : ov.junkRate > 15 ? "warm" : "good"}
              sub={`${ov.junkLeads} lead rác`}
            />
            <StatCard label="Chi phí / lead thật" value={fmtVnd(ov.costPerGoodLead)} sub={`Thô: ${fmtVnd(ov.costPerLead)}`} />
          </div>

          {ov.junkRate > 30 && (
            <div className="card p-4 border-l-4 border-l-junk bg-red-50">
              <div className="font-semibold text-red-700">⚠️ Tỉ lệ lead rác cao ({ov.junkRate}%)</div>
              <p className="text-sm text-red-600 mt-1">
                Ads đang ra nhiều tệp rác. Xem bảng dưới để biết chiến dịch nào là thủ phạm và cân
                nhắc tắt / thu hẹp tệp nhắm.
              </p>
            </div>
          )}

          <div className="card">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold">Chiến dịch ra nhiều rác nhất</h2>
              <Link href="/ads" className="text-sm text-brand hover:underline">
                Xem tất cả →
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {worst.length === 0 && <div className="px-5 py-4 text-sm text-gray-500">Chưa đủ dữ liệu.</div>}
              {worst.map((c) => (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      {c.total} lead · {fmtVnd(c.spend)} chi phí · {fmtVnd(c.costPerGoodLead)}/lead thật
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-bold ${c.junkRate > 40 ? "text-junk" : "text-warm"}`}>{c.junkRate}%</div>
                    <div className="text-xs text-gray-400">rác</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
