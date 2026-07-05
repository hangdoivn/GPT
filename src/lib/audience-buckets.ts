// Nhóm chiến dịch thành bucket targeting B/C/E rồi tính tỉ lệ rác + won theo bucket.
// Suy bucket từ TÊN campaign (heuristic) vì targeting chi tiết cần Marketing API + adset.
import { prisma } from "./db";
import type { Bucket, BucketStat } from "./audience-eval";

export function inferBucket(name: string): Bucket {
  const s = name.toLowerCase();
  const isRetarget = /retarget|remarket|re-?target|khách cũ|đã mua|nhắm lại/.test(s);
  const isLookalike = /look-?alike|lookalike|\blal\b|tương tự|lls?%/.test(s);
  const hasCustomer = /khách|mua|customer|purchase|buyer|list|sđt|số điện|đơn hàng/.test(s);

  if (isRetarget) return "core"; // retarget người đã tương tác/mua = tệp ấm
  if (isLookalike) return hasCustomer ? "core" : "engager";
  if (/broad|giá rẻ|gia re|interest|sở thích|rộng|rong/.test(s)) return "broad";
  return "broad"; // mặc định: coi là broad
}

const LABEL: Record<Bucket, string> = {
  broad: "Broad / Sở thích",
  core: "Lookalike/Retarget từ khách mua",
  engager: "Lookalike từ người tương tác",
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Trả về thống kê rác/won theo bucket targeting. */
export async function getAudienceBuckets(): Promise<BucketStat[]> {
  const campaigns = await prisma.campaign.findMany({ select: { id: true, name: true } });

  const agg = new Map<Bucket, { total: number; junk: number; won: number }>();
  for (const c of campaigns) {
    const b = inferBucket(c.name);
    const [total, junk, won] = await Promise.all([
      prisma.lead.count({ where: { campaignId: c.id } }),
      prisma.lead.count({ where: { campaignId: c.id, quality: "junk" } }),
      prisma.lead.count({ where: { campaignId: c.id, crmStatus: "won" } }),
    ]);
    const cur = agg.get(b) ?? { total: 0, junk: 0, won: 0 };
    cur.total += total;
    cur.junk += junk;
    cur.won += won;
    agg.set(b, cur);
  }

  const out: BucketStat[] = [];
  for (const [bucket, v] of agg) {
    if (v.total === 0) continue;
    out.push({
      bucket,
      label: LABEL[bucket],
      total: v.total,
      junk: v.junk,
      junkRate: round1((v.junk / v.total) * 100),
      wonRate: round1((v.won / v.total) * 100),
    });
  }
  // Thứ tự hiển thị: broad -> core -> engager
  const order: Bucket[] = ["broad", "core", "engager"];
  return out.sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket));
}
