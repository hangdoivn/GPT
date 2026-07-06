// Engine đánh giá "tệp người xem" của page -> phán quyết Giữ / Sửa ads / Detox / Page mới.
// Thiết kế theo spec 4 trụ (thuần logic, không phụ thuộc DB/FB -> dễ test).
//
// Trọng tâm chẩn đoán: rác do CÁCH NHẮM ADS (broad) hay do TỆP PAGE (lookalike/retarget)?
// -> nhóm lead-rác theo bucket targeting, so source_floor (tệp lõi) với broad.

import type { Finding } from "./insights-analysis";

export type Bucket = "broad" | "core" | "engager";

export interface BucketStat {
  bucket: Bucket;
  label: string;
  total: number;
  junk: number;
  junkRate: number; // %
  wonRate: number; // % chốt đơn — phân biệt "số ảo" vs "sai tệp mua"
}

export interface AudienceInput {
  junkRate: number; // % rác tổng (từ analytics.getOverview)
  buckets: BucketStat[]; // nhóm targeting B/C/E
  engagementRate: number; // % engagement/reach (từ insights)
  reachTrendPct: number; // % thay đổi tiếp cận nửa sau vs nửa đầu
  fanAddsNet: number; // follow ròng (follows - unfollows)
  churnRatio: number; // unfollows/follows
  followers: number;
  insightsAvailable?: boolean; // false nếu thiếu quyền read_insights -> không phạt 2 trụ organic
  // Làm giàu từ Facebook (undefined nếu chưa kết nối / thiếu quyền)
  adBelowAvgShare?: number; // 0-1: tỉ lệ ad có quality_ranking dưới trung bình
  foreignReachRatio?: number; // 0-1: tỉ lệ reach ngoài VN (từ Ads breakdown)
  accountRestricted?: boolean; // account/page bị hạn chế policy
  rating?: { stars: number; count: number };
}

export type Verdict = "keep_page" | "fix_ads" | "clean_audience" | "new_page";

export interface Pillars {
  leadPurity: number;
  adRelevance: number;
  organicVitality: number;
  growthRetention: number;
}

export interface Diagnosis {
  broadJunk: number | null;
  sourceFloor: number | null; // rác thấp nhất của tệp lõi (core)
  targetingExcess: number | null; // broadJunk - sourceFloor
  matrix: string; // kết luận ma trận B/C/E
}

export interface AudienceEval {
  score: number; // 0-100
  band: "healthy" | "warning" | "polluted";
  pillars: Pillars;
  verdict: Verdict;
  verdictTitle: string;
  verdictReason: string;
  redLine: boolean;
  redLineReason?: string;
  diagnosis: Diagnosis;
  signals: Finding[];
  confidence: "low" | "medium" | "high";
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export const VERDICT_LABEL: Record<Verdict, string> = {
  keep_page: "Giữ page cũ",
  fix_ads: "Giữ page — sửa cách nhắm ads",
  clean_audience: "Giữ page — chạy detox làm sạch tệp",
  new_page: "Cân nhắc làm page mới",
};

function bandOf(score: number): AudienceEval["band"] {
  if (score >= 67) return "healthy";
  if (score >= 40) return "warning";
  return "polluted";
}

// Dải màu chuẩn của app cho tỉ lệ rác.
export function junkBand(rate: number): "good" | "warm" | "bad" {
  if (rate < 20) return "good";
  if (rate <= 40) return "warm";
  return "bad";
}

export function evaluateAudience(input: AudienceInput): AudienceEval {
  // ── 4 trụ ────────────────────────────────────────────────
  const leadPurity = clamp(100 - input.junkRate);

  let adRelevance = 60; // trung tính khi chưa có dữ liệu Facebook
  if (input.adBelowAvgShare !== undefined) {
    adRelevance = clamp(100 - input.adBelowAvgShare * 100);
  }

  // Thiếu quyền read_insights -> không có số organic thật -> tính TRUNG TÍNH,
  // KHÔNG phạt (tránh phán quyết "page mới" oan). Phán quyết dựa vào lead + ads.
  const insightsOn = input.insightsAvailable !== false;

  const erBase =
    input.engagementRate >= 5 ? 85 : input.engagementRate >= 3 ? 65 : input.engagementRate >= 1 ? 40 : 15;
  const reachAdj = input.reachTrendPct <= -20 ? -15 : input.reachTrendPct > 0 ? 5 : 0;
  const organicVitality = insightsOn ? clamp(erBase + reachAdj) : 55;

  let growthRetention;
  if (!insightsOn) {
    growthRetention = 55;
  } else {
    growthRetention = input.fanAddsNet > 0 ? 100 : input.fanAddsNet === 0 ? 55 : 10;
    if (input.churnRatio > 0.5) growthRetention -= 30;
    if (input.churnRatio > 1) growthRetention = 10;
    growthRetention = clamp(growthRetention);
  }

  const pillars: Pillars = { leadPurity, adRelevance, organicVitality, growthRetention };

  let score = Math.round(
    0.35 * leadPurity + 0.25 * adRelevance + 0.2 * organicVitality + 0.2 * growthRetention,
  );

  // ── Red-line: Facebook đã "ghim" tài sản -> ép điểm thấp ──
  let redLine = false;
  let redLineReason: string | undefined;
  if (input.accountRestricted) {
    redLine = true;
    redLineReason = "Tài khoản quảng cáo / page đang bị hạn chế theo chính sách Facebook.";
  } else if (input.adBelowAvgShare !== undefined && input.adBelowAvgShare >= 0.5) {
    redLine = true;
    redLineReason = "Phần lớn quảng cáo bị xếp hạng chất lượng dưới trung bình dù creative tốt — dấu hiệu bị ghim reach.";
  }
  if (redLine) score = Math.min(score, 39);

  // ── Chẩn đoán ADS vs PAGE (theo bucket) ──────────────────
  const diagnosis = diagnose(input.buckets);

  // ── Phán quyết ───────────────────────────────────────────
  const redFlags = countRedFlags(input, diagnosis);
  let verdict: Verdict;
  let verdictReason: string;

  if (redLine) {
    verdict = "new_page";
    verdictReason = `${redLineReason} Không targeting nào rửa được khi tài sản bị ghim — bung page mới song song (giữ pixel/ad account/CRM), page cũ chuyển sang CSKH.`;
  } else if (
    diagnosis.broadJunk !== null &&
    diagnosis.broadJunk > 40 &&
    diagnosis.sourceFloor !== null &&
    diagnosis.sourceFloor < 20
  ) {
    verdict = "fix_ads";
    verdictReason = `Tệp lõi (lookalike/retarget từ khách mua) ra lead sạch (${diagnosis.sourceFloor}%) nhưng broad giá rẻ ra rác ${diagnosis.broadJunk}%. Rác do CÁCH NHẮM, KHÔNG phải DNA page — tắt broad, dồn ngân sách sang tệp lõi, đổi objective sang chất lượng. Không cần page mới.`;
  } else if (score >= 67) {
    verdict = "keep_page";
    verdictReason =
      diagnosis.broadJunk !== null && diagnosis.broadJunk > 40
        ? `Tệp page về cơ bản khoẻ (điểm ${score}). Chỉ có broad giá rẻ ra rác — siết lại targeting là đủ, giữ page.`
        : `Tệp page khoẻ (điểm ${score}). Chi phí bỏ page lớn hơn lợi ích — giữ và tinh chỉnh nội dung/targeting.`;
  } else if (score >= 40) {
    verdict = "clean_audience";
    verdictReason = `Tệp chớm ô nhiễm (điểm ${score}) nhưng cứu được. Chạy detox 3–4 tuần: tắt campaign rác cao nhất, dựng lookalike CHỈ từ khách mua thật, bỏ seed "người tương tác page", thêm trường lọc trong form — rồi chấm lại.`;
  } else {
    verdict = "new_page";
    verdictReason = `Tệp ô nhiễm nặng (điểm ${score}) với ${redFlags} cờ đỏ. Nếu sau 1 vòng detox không cải thiện >10 điểm thì nên bung page mới (giữ pixel/ad account/CRM/lookalike-từ-khách-mua), page cũ để CSKH.`;
  }

  // ── Tín hiệu chi tiết ────────────────────────────────────
  const signals = buildSignals(input, diagnosis, redLine, redLineReason);

  // ── Độ tin cậy ───────────────────────────────────────────
  const hasFb = input.adBelowAvgShare !== undefined || input.foreignReachRatio !== undefined;
  const smallSample = input.buckets.reduce((s, b) => s + b.total, 0) < 50;
  const confidence: AudienceEval["confidence"] = smallSample ? "low" : hasFb ? "high" : "medium";

  return {
    score,
    band: bandOf(score),
    pillars,
    verdict,
    verdictTitle: VERDICT_LABEL[verdict],
    verdictReason,
    redLine,
    redLineReason,
    diagnosis,
    signals,
    confidence,
  };
}

function diagnose(buckets: BucketStat[]): Diagnosis {
  const broad = buckets.find((b) => b.bucket === "broad");
  const core = buckets.filter((b) => b.bucket === "core");
  const engager = buckets.filter((b) => b.bucket === "engager");

  const broadJunk = broad ? broad.junkRate : null;
  const sourceFloor = core.length ? Math.min(...core.map((b) => b.junkRate)) : null;
  const targetingExcess = broadJunk !== null && sourceFloor !== null ? Math.round((broadJunk - sourceFloor) * 10) / 10 : null;

  const eJunk = engager.length ? Math.min(...engager.map((b) => b.junkRate)) : null;

  const excess = targetingExcess;
  let matrix: string;
  if (broadJunk === null && sourceFloor === null) {
    matrix = "Chưa đủ dữ liệu campaign để phân bucket. Cần gắn nhãn broad/lookalike/retarget cho các chiến dịch.";
  } else if (sourceFloor !== null && sourceFloor >= 40) {
    matrix = `Cả tệp lõi (lookalike/retarget từ khách) cũng ra rác ${sourceFloor}% → nguồn tệp bẩn tận lõi, không targeting nào rửa được. Cân nhắc page mới (sau khi khử nhiễu offer/objective).`;
  } else if (broadJunk !== null && broadJunk > 40 && sourceFloor !== null && sourceFloor < 20) {
    matrix = `Broad rác ${broadJunk}% nhưng tệp lõi chỉ ${sourceFloor}% → rác do CÁCH NHẮM ads, KHÔNG phải DNA page. Giữ page, tắt broad, dồn ngân sách sang tệp lõi.`;
  } else if (broadJunk !== null && broadJunk > 40 && excess !== null && excess >= 25) {
    matrix = `Broad rác cao hơn tệp lõi tới ${excess}% (broad ${broadJunk}% vs lõi ${sourceFloor}%) → thủ phạm chính là cách nhắm broad. Ưu tiên tắt broad + dồn tệp lõi; tệp lõi ${sourceFloor}% nên detox nhẹ song song.`;
  } else if (broadJunk !== null && broadJunk <= 20 && sourceFloor !== null && sourceFloor <= 20) {
    matrix = "Cả broad lẫn tệp lõi đều sạch → rác không phải vấn đề lớn của page. Tối ưu nội dung/chốt đơn.";
  } else if (eJunk !== null && eJunk > 40 && sourceFloor !== null && sourceFloor < 20) {
    matrix = "Tệp 'người tương tác' bẩn nhưng lõi khách sạch → dựng lại lookalike CHỈ từ list SĐT khách mua, bỏ seed engager (detox).";
  } else {
    matrix = "Rác rải đều mức trung bình giữa các nhóm — dồn ngân sách vào bucket sạch nhất, theo dõi thêm 3–4 tuần trước khi kết luận.";
  }

  return { broadJunk, sourceFloor, targetingExcess, matrix };
}

function countRedFlags(input: AudienceInput, d: Diagnosis): number {
  const insightsOn = input.insightsAvailable !== false;
  let n = 0;
  if (input.junkRate > 60) n++;
  if (insightsOn && input.engagementRate < 1) n++; // chỉ tính khi có số insights thật
  if (insightsOn && input.churnRatio > 0.5) n++;
  if (insightsOn && input.fanAddsNet < 0) n++;
  if (input.foreignReachRatio !== undefined && input.foreignReachRatio > 0.25) n++;
  if (input.adBelowAvgShare !== undefined && input.adBelowAvgShare >= 0.5) n++;
  if (d.sourceFloor !== null && d.sourceFloor > 40) n++;
  return n;
}

function buildSignals(input: AudienceInput, d: Diagnosis, redLine: boolean, redLineReason?: string): Finding[] {
  const out: Finding[] = [];

  if (redLine) out.push({ sentiment: "bad", title: "Cờ đỏ: bị Facebook ghim tài sản", detail: redLineReason ?? "" });

  if (d.broadJunk !== null && d.sourceFloor !== null) {
    const excess = d.targetingExcess ?? 0;
    out.push({
      sentiment: excess > 30 ? "info" : "warn",
      title: `Chênh lệch rác targeting: broad ${d.broadJunk}% vs tệp lõi ${d.sourceFloor}%`,
      detail:
        excess > 30
          ? "Chênh lớn → thủ phạm là cách nhắm broad, không phải tệp page. Tin tốt: chỉ cần sửa ads."
          : "Chênh nhỏ → rác đến từ cả tệp lõi, không chỉ targeting. Cần soi lại nguồn tệp.",
    });
  }

  out.push({
    sentiment: input.junkRate > 40 ? "bad" : input.junkRate > 20 ? "warn" : "good",
    title: `Tỉ lệ lead rác tổng: ${input.junkRate}%`,
    detail: input.junkRate > 40 ? "Cao — nhiều SĐT ảo/tên giả lọt vào." : "Trong ngưỡng chấp nhận được.",
  });

  if (input.insightsAvailable === false) {
    out.push({
      sentiment: "info",
      title: "Chưa có chỉ số organic (tương tác/reach/churn)",
      detail:
        "App chưa được cấp quyền read_insights (Facebook giới hạn với loại app hiện tại). Phán quyết đang dựa trên lead + ads — 2 trụ organic tính trung tính, không phạt. Xin quyền qua App Review để mở đầy đủ.",
    });
  } else {
    out.push({
      sentiment: input.engagementRate >= 3 ? "good" : input.engagementRate >= 1 ? "warn" : "bad",
      title: `Tỉ lệ tương tác: ${input.engagementRate}%`,
      detail:
        input.engagementRate < 1
          ? "Reach có nhưng gần như không ai tương tác — dấu hiệu tệp 'chai'/ghost."
          : "Tệp còn phản hồi với nội dung.",
    });
    out.push({
      sentiment: input.churnRatio > 0.5 ? "bad" : input.churnRatio > 0.3 ? "warn" : "good",
      title: `Tỉ lệ rời page (churn): ${input.churnRatio.toFixed(2)}`,
      detail:
        input.churnRatio > 0.5
          ? "Fan rời nhanh sau khi follow — thường là follow ảo/không thật bị quét."
          : "Giữ chân ổn.",
    });
  }

  if (input.foreignReachRatio !== undefined) {
    const pct = Math.round(input.foreignReachRatio * 1000) / 10;
    out.push({
      sentiment: input.foreignReachRatio > 0.25 ? "bad" : input.foreignReachRatio > 0.1 ? "warn" : "good",
      title: `Tiếp cận ngoài VN: ${pct}%`,
      detail: input.foreignReachRatio > 0.1 ? "Page chỉ ship VN mà tệp ngoại cao — dấu hiệu farm/mua like." : "Chủ yếu là người Việt.",
    });
  } else {
    out.push({
      sentiment: "info",
      title: "Nhân khẩu tệp: cần kết nối ads",
      detail:
        "Facebook đã gỡ nhân khẩu follower organic (2024). Chỉ suy được tuổi/giới/vùng qua Ads breakdown khi đang chạy ads — hãy kết nối để mở phần này.",
    });
  }

  return out;
}
