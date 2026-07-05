import { getCampaignQuality } from "@/lib/analytics";
import { fmtVnd } from "@/components/ui";
import { JunkChart } from "@/components/JunkChart";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const campaigns = await getCampaignQuality();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Chiến dịch Ads</h1>
        <p className="text-sm text-gray-500">
          So sánh chi phí và <b>tỉ lệ lead rác</b> giữa các chiến dịch để biết ads nào nên tắt.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          Chưa có chiến dịch. Đồng bộ Facebook hoặc nạp dữ liệu demo ở trang Tổng quan.
        </div>
      ) : (
        <>
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Tỉ lệ rác theo chiến dịch</h2>
            <JunkChart data={campaigns.map((c) => ({ name: c.name, junkRate: c.junkRate }))} />
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Chiến dịch</th>
                    <th className="text-center px-4 py-3">Trạng thái</th>
                    <th className="text-right px-4 py-3">Chi phí</th>
                    <th className="text-right px-4 py-3">Lead</th>
                    <th className="text-right px-4 py-3">Rác</th>
                    <th className="text-right px-4 py-3">Tỉ lệ rác</th>
                    <th className="text-right px-4 py-3">CP / lead thật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.status === "ACTIVE" ? "Đang chạy" : "Tạm dừng"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{fmtVnd(c.spend)}</td>
                      <td className="px-4 py-3 text-right">{c.total}</td>
                      <td className="px-4 py-3 text-right text-junk">{c.junk}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        <span className={c.junkRate > 40 ? "text-junk" : c.junkRate > 20 ? "text-warm" : "text-good"}>
                          {c.junkRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{c.total ? fmtVnd(c.costPerGoodLead) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            💡 <b>CP / lead thật</b> = chi phí chia cho số lead không phải rác. Chiến dịch có tỉ lệ
            rác cao và CP/lead thật đắt là ứng viên nên tắt hoặc thu hẹp tệp nhắm mục tiêu.
          </p>
        </>
      )}
    </div>
  );
}
