// Đánh giá page + mục tiêu có đang nhắm ĐÚNG TỆP KHÁCH CAO CẤP không
// (vd doanh nghiệp F&B/hospitality doanh thu > 25tr/tháng).
// 4 trụ: Định vị nội dung · Tín hiệu giá trị · Chất lượng nhắm · Chất lượng lead.
// Thuần logic -> dễ test.

import type { Finding } from "./insights-analysis";
import type { PillarAnalysis } from "./marcom";
import { stripDiacritics } from "./marcom";
import type { OpTask } from "./marcom";

// Từ khoá tín hiệu định vị (đã bỏ dấu).
const DISCOUNT_WORDS = ["giam gia", "sale", "soc", "gia re", " re ", "khuyen mai", "mien phi", "0d", "deal", "flash", "xa kho", "thanh ly"];
const PREMIUM_WORDS = ["tu van", "giai phap", "dong hanh", "chien luoc", "he thong", "thuong hieu", "dau tu", "roi", "hieu qua", "chuyen nghiep", "cao cap", "premium", "chuan", "ben vung", "quy trinh"];

export interface ContentSignal {
  discountDensity: number; // 0-1: tỉ lệ bài có ngôn ngữ giảm giá
  premiumDensity: number; // 0-1: tỉ lệ bài có ngôn ngữ tư vấn/giá trị
}

/** Quét tín hiệu định vị (giảm giá vs tư vấn giá trị) từ nội dung bài. */
export function scanContentSignal(messages: string[]): ContentSignal {
  const n = messages.length || 1;
  let disc = 0;
  let prem = 0;
  for (const m of messages) {
    const t = ` ${stripDiacritics(m || "")} `;
    if (DISCOUNT_WORDS.some((w) => t.includes(w))) disc++;
    if (PREMIUM_WORDS.some((w) => t.includes(w))) prem++;
  }
  return { discountDensity: disc / n, premiumDensity: prem / n };
}

export interface PremiumFitInput {
  icpMinVnd: number; // ngưỡng doanh thu tệp cao cấp
  icpNote?: string | null;
  pillars: PillarAnalysis;
  signal: ContentSignal;
  coreJunkRate: number | null; // % rác tệp lõi (lookalike/retarget) — nếu có
  broadJunkRate: number | null; // % rác broad — nếu có
  leadToQualified: number | null; // % (funnel)
  qualifiedToWon: number | null; // %
  hasData: boolean; // đủ bài/lead để đánh giá
}

export interface PremiumPillars {
  positioning: number; // định vị nội dung
  valueSignal: number; // tín hiệu giá trị
  targeting: number; // chất lượng nhắm
  leadQuality: number; // chất lượng lead
}

export interface PremiumFit {
  score: number; // 0-100
  band: "aligned" | "mixed" | "mass";
  verdict: string;
  pillars: PremiumPillars;
  findings: Finding[];
  shifts: OpTask[]; // đầu việc dịch chuyển về tệp cao cấp
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

function shareOf(p: PillarAnalysis, key: string): number {
  return p.pillars.find((x) => x.key === key)?.sharePct ?? 0;
}

export function analyzePremiumFit(inp: PremiumFitInput): PremiumFit {
  const proof = shareOf(inp.pillars, "proof");
  const edu = shareOf(inp.pillars, "educational");
  const promo = shareOf(inp.pillars, "promotional");

  // 1) Định vị nội dung: case study + kiến thức kéo tệp cao cấp; bán hàng nhiều kéo tệp giá rẻ.
  const positioning = clamp(45 + (proof + edu) * 0.7 - promo * 0.5);

  // 2) Tín hiệu giá trị: ngôn ngữ tư vấn/ROI (+) vs giảm giá/sốc (−).
  const valueSignal = clamp(50 + inp.signal.premiumDensity * 100 * 0.6 - inp.signal.discountDensity * 100 * 0.9);

  // 3) Chất lượng nhắm: tệp lõi càng sạch càng đúng tệp cao cấp.
  let targeting: number;
  if (inp.coreJunkRate != null) targeting = clamp(100 - inp.coreJunkRate);
  else if (inp.broadJunkRate != null) targeting = clamp(85 - inp.broadJunkRate); // chỉ có broad -> trần thấp hơn
  else targeting = 55;

  // 4) Chất lượng lead: lead đạt chuẩn + chốt được = đang chạm đúng người có tiền.
  let leadQuality: number;
  if (inp.leadToQualified != null || inp.qualifiedToWon != null) {
    const l2q = inp.leadToQualified ?? 40;
    const q2w = inp.qualifiedToWon ?? 15;
    leadQuality = clamp(l2q * 0.7 + q2w * 1.4);
  } else leadQuality = 55;

  const pillars: PremiumPillars = { positioning, valueSignal, targeting, leadQuality };
  const score = clamp(0.3 * positioning + 0.25 * valueSignal + 0.25 * targeting + 0.2 * leadQuality);
  const band: PremiumFit["band"] = score >= 67 ? "aligned" : score >= 45 ? "mixed" : "mass";

  const trM = Math.round(inp.icpMinVnd / 1_000_000);
  const icpLabel = inp.icpNote?.trim() || `doanh nghiệp doanh thu > ${trM}tr/tháng`;

  let verdict: string;
  if (!inp.hasData) {
    verdict = `Chưa đủ dữ liệu (bài đăng/lead) để đánh giá độ phù hợp với tệp cao cấp (${icpLabel}). Kết nối số thật + đồng bộ lead rồi xem lại.`;
  } else if (band === "aligned") {
    verdict = `Page đang nhắm ĐÚNG tệp cao cấp (${icpLabel}). Định vị & tệp lead khớp — giữ hướng, nâng dần giá trị đơn.`;
  } else if (band === "mixed") {
    verdict = `Page đang HỖN HỢP — vừa hút tệp cao cấp vừa dính tệp giá rẻ. Cần siết định vị & nhắm để dồn về ${icpLabel}.`;
  } else {
    verdict = `Page đang lệch về TỆP GIÁ RẺ, chưa chạm ${icpLabel}. Nội dung/nhắm đang kéo khách săn giá — cần tái định vị mạnh.`;
  }

  const findings: Finding[] = [];
  findings.push({
    sentiment: band === "aligned" ? "good" : band === "mixed" ? "warn" : "bad",
    title: `Điểm phù hợp tệp cao cấp: ${score}/100`,
    detail: verdict,
  });
  findings.push({
    sentiment: positioning >= 60 ? "good" : positioning >= 45 ? "warn" : "bad",
    title: `Định vị nội dung: ${positioning}/100 (case study ${proof}% · kiến thức ${edu}% · bán hàng ${promo}%)`,
    detail: promo >= 40 ? "Đăng bán hàng/ưu đãi quá nhiều — kéo khách săn giá. Tăng case study + kiến thức để định vị chuyên gia." : "Định vị nghiêng về chuyên môn — tốt để hút tệp cao cấp.",
  });
  findings.push({
    sentiment: valueSignal >= 60 ? "good" : valueSignal >= 45 ? "warn" : "bad",
    title: `Tín hiệu giá trị: ${valueSignal}/100`,
    detail:
      inp.signal.discountDensity > 0.25
        ? `Ngôn ngữ giảm giá/sốc xuất hiện ${Math.round(inp.signal.discountDensity * 100)}% số bài — tín hiệu tệp giá rẻ. Đổi sang thông điệp tư vấn/giải pháp/ROI.`
        : "Ít ngôn ngữ giảm giá — thông điệp thiên về giá trị, hợp tệp cao cấp.",
  });
  if (inp.coreJunkRate != null || inp.broadJunkRate != null) {
    findings.push({
      sentiment: targeting >= 60 ? "good" : targeting >= 45 ? "warn" : "bad",
      title: `Chất lượng nhắm: ${targeting}/100`,
      detail: (inp.coreJunkRate ?? 100) > 20 || (inp.broadJunkRate ?? 100) > 40 ? "Nhắm đang lọt nhiều rác — dựng lookalike từ khách đã CHỐT (tệp có tiền), bỏ broad giá rẻ." : "Nhắm đang tương đối sạch.",
    });
  }

  // ── Đầu việc dịch chuyển về tệp cao cấp ──
  const shifts: OpTask[] = [];
  if (promo >= 35 || inp.signal.discountDensity > 0.2) {
    shifts.push({
      area: "Content",
      priority: "cao",
      title: `Tái định vị thông điệp: bỏ "giảm giá/sốc", chuyển sang "giải pháp – ROI – đồng hành thương hiệu".`,
      why: `Bài bán hàng ${promo}% + ngôn ngữ giảm giá ${Math.round(inp.signal.discountDensity * 100)}% đang kéo khách săn giá, lệch tệp ${icpLabel}.`,
    });
  }
  if (proof < 20) {
    shifts.push({
      area: "Media",
      priority: "cao",
      title: `Sản xuất case study có CON SỐ (doanh thu/lượt khách tăng sau khi làm visual) cho khách cao cấp.`,
      why: "Tệp >25tr/tháng ra quyết định bằng bằng chứng ROI, không bằng giá. Case study là đòn bẩy chốt mạnh nhất.",
    });
  }
  if ((inp.coreJunkRate ?? 0) > 20 || (inp.broadJunkRate ?? 0) > 40) {
    shifts.push({
      area: "Ads",
      priority: "cao",
      title: `Dựng lookalike 1–2% từ danh sách khách ĐÃ CHỐT giá cao; tắt broad giá rẻ.`,
      why: "Lookalike từ khách thật giúp Facebook tìm người GIỐNG khách có tiền — đúng tệp cao cấp hơn broad.",
    });
  }
  shifts.push({
    area: "Content",
    priority: "vừa",
    title: `Thêm "mỏ neo giá" (bảng giá/gói cao cấp) để tự lọc khách — người hỏi giá rẻ tự rời, khách nghiêm túc ở lại.`,
    why: "Ẩn giá thu hút cả tệp rẻ; nêu phân khúc giá giúp lọc đúng doanh nghiệp có ngân sách >25tr/tháng.",
  });

  const rank: Record<string, number> = { cao: 0, vừa: 1, thấp: 2 };
  shifts.sort((a, b) => rank[a.priority] - rank[b.priority]);

  return { score, band, verdict, pillars, findings, shifts };
}
