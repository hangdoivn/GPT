// "Cố vấn MarCom" — biến dữ liệu thành KẾ HOẠCH VẬN HÀNH theo mục tiêu.
// Đóng vai giám đốc marketing: nhìn khoảng cách tới mục tiêu -> giao brief
// sản xuất cụ thể cho team (Media / Design / Ads / Sale) sẵn có.
// Thuần logic (không phụ thuộc DB/FB) -> dễ test.

import type { Finding } from "./insights-analysis";

// ─── Trụ nội dung (content pillars) ───────────────────────────────────

export type PillarKey = "educational" | "proof" | "promotional" | "bts" | "inspiration" | "other";

interface PillarDef {
  key: PillarKey;
  label: string;
  keywords: string[]; // đã bỏ dấu, lowercase
  // giá trị cho B2B lead-gen (cao = ưu tiên sản xuất)
  leadValue: "high" | "medium" | "low";
}

// Trụ nội dung cho studio media/marketing phục vụ F&B/hospitality.
const PILLARS: PillarDef[] = [
  {
    key: "educational",
    label: "Kiến thức / Tips",
    keywords: ["tips", "meo", "bi quyet", "huong dan", "cach ", "kien thuc", "checklist", "luu y", "sai lam", "tai sao", "vi sao", "how to"],
    leadValue: "high",
  },
  {
    key: "proof",
    label: "Case study / Kết quả",
    keywords: ["case", "ket qua", "before", "after", "truoc", "sau", "du an", "khach hang", "review", "phan hoi", "portfolio", "thuc te", "chuyen doi"],
    leadValue: "high",
  },
  {
    key: "promotional",
    label: "Dịch vụ / Ưu đãi",
    keywords: ["dich vu", "bao gia", "uu dai", "khuyen mai", "goi ", "combo", "inbox", "lien he", "dang ky", "dat lich", "giam gia", "book", "tu van"],
    leadValue: "medium",
  },
  {
    key: "bts",
    label: "Hậu trường / Quy trình",
    keywords: ["hau truong", "behind", "ekip", "team", "quy trinh", "qua trinh", "setup", "on set", "san xuat"],
    leadValue: "medium",
  },
  {
    key: "inspiration",
    label: "Câu chuyện / Cảm hứng",
    keywords: ["cau chuyen", "cam hung", "chia se", "hanh trinh", "story", "tam su"],
    leadValue: "low",
  },
];

const PILLAR_LABEL: Record<PillarKey, string> = {
  educational: "Kiến thức / Tips",
  proof: "Case study / Kết quả",
  promotional: "Dịch vụ / Ưu đãi",
  bts: "Hậu trường / Quy trình",
  inspiration: "Câu chuyện / Cảm hứng",
  other: "Khác",
};

/** Bỏ dấu tiếng Việt để so khớp keyword ổn định. */
export function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Phân loại 1 bài đăng vào trụ nội dung theo nội dung text. */
export function classifyPillar(message: string): PillarKey {
  const t = stripDiacritics(message || "");
  if (!t.trim()) return "other";
  let best: PillarKey = "other";
  let bestHits = 0;
  for (const p of PILLARS) {
    const hits = p.keywords.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
    if (hits > bestHits) {
      bestHits = hits;
      best = p.key;
    }
  }
  return best;
}

export interface PillarStat {
  key: PillarKey;
  label: string;
  posts: number;
  engagement: number;
  avg: number; // engagement/bài
  sharePct: number; // % số bài
  leadValue: "high" | "medium" | "low";
}

export interface PillarAnalysis {
  pillars: PillarStat[];
  dominant?: PillarStat; // trụ đang được đăng nhiều nhất
  bestPerforming?: PillarStat; // trụ tương tác/bài cao nhất
  missingHighValue: PillarKey[]; // trụ giá trị cao đang thiếu/yếu
  findings: Finding[];
}

const leadValueOf = (k: PillarKey): "high" | "medium" | "low" =>
  PILLARS.find((p) => p.key === k)?.leadValue ?? "low";

export function analyzePillars(posts: { message: string; engagement: number }[]): PillarAnalysis {
  const agg = new Map<PillarKey, { posts: number; engagement: number }>();
  for (const post of posts) {
    const key = classifyPillar(post.message);
    const cur = agg.get(key) ?? { posts: 0, engagement: 0 };
    cur.posts++;
    cur.engagement += post.engagement;
    agg.set(key, cur);
  }
  const total = posts.length || 1;

  const pillars: PillarStat[] = [...agg.entries()]
    .map(([key, v]) => ({
      key,
      label: PILLAR_LABEL[key],
      posts: v.posts,
      engagement: v.engagement,
      avg: v.posts ? Math.round(v.engagement / v.posts) : 0,
      sharePct: Math.round((v.posts / total) * 100),
      leadValue: leadValueOf(key),
    }))
    .sort((a, b) => b.posts - a.posts);

  const dominant = pillars[0];
  const bestPerforming = [...pillars].filter((p) => p.posts > 0).sort((a, b) => b.avg - a.avg)[0];

  // Trụ giá trị cao (educational, proof) đang thiếu hoặc <15% số bài.
  const highValueKeys: PillarKey[] = ["educational", "proof"];
  const missingHighValue = highValueKeys.filter((k) => {
    const found = pillars.find((p) => p.key === k);
    return !found || found.sharePct < 15;
  });

  const findings: Finding[] = [];
  if (posts.length < 3) {
    findings.push({ sentiment: "info", title: "Chưa đủ bài để phân tích trụ nội dung", detail: "Cần ít nhất 3–5 bài để đánh giá trụ nội dung nào hiệu quả." });
    return { pillars, dominant, bestPerforming, missingHighValue, findings };
  }

  if (bestPerforming) {
    findings.push({
      sentiment: "good",
      title: `Trụ ăn khách nhất: ${bestPerforming.label} (${bestPerforming.avg} tương tác/bài)`,
      detail: `Nội dung dạng "${bestPerforming.label}" đang tạo tương tác cao nhất. Tăng sản lượng trụ này.`,
    });
  }
  if (dominant && dominant.key === "promotional" && dominant.sharePct >= 40) {
    findings.push({
      sentiment: "warn",
      title: `Đăng bán hàng quá nhiều (${dominant.sharePct}%)`,
      detail: "Nội dung nghiêng về chào dịch vụ/ưu đãi — dễ làm chai tệp. Cân bằng bằng kiến thức & case study để xây uy tín, kéo đúng chủ quán.",
    });
  }
  for (const k of missingHighValue) {
    findings.push({
      sentiment: "warn",
      title: `Thiếu trụ "${PILLAR_LABEL[k]}" — trụ chốt lead B2B`,
      detail:
        k === "educational"
          ? "Ít nội dung kiến thức/tips. Đây là trụ xây uy tín chuyên môn, kéo đúng chủ nhà hàng/quán — nên chiếm ~30% lịch đăng."
          : "Ít case study/kết quả. Đây là trụ thuyết phục khách B2B mạnh nhất (before/after, phản hồi khách) — thiếu nó là mất chuyển đổi.",
    });
  }

  return { pillars, dominant, bestPerforming, missingHighValue, findings };
}

// ─── Phễu chuyển đổi (marketing funnel) ───────────────────────────────

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
}
export interface FunnelConv {
  from: string;
  to: string;
  rate: number; // %
  label: string;
}
export interface FunnelAnalysis {
  stages: FunnelStage[];
  conversions: FunnelConv[];
  weakest?: FunnelConv;
  findings: Finding[];
}

export interface FunnelInput {
  reachPerWeek?: number | null; // undefined/null nếu chưa có số thật
  engagementPerWeek?: number | null;
  leads: number;
  qualified: number; // good+warm hoặc crm qualified/won
  won: number;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export function analyzeFunnel(input: FunnelInput): FunnelAnalysis {
  const stages: FunnelStage[] = [];
  if (input.reachPerWeek != null) stages.push({ key: "reach", label: "Tiếp cận/tuần", value: input.reachPerWeek });
  if (input.engagementPerWeek != null) stages.push({ key: "engagement", label: "Tương tác/tuần", value: input.engagementPerWeek });
  stages.push({ key: "leads", label: "Lead thu về", value: input.leads });
  stages.push({ key: "qualified", label: "Lead chất lượng", value: input.qualified });
  stages.push({ key: "won", label: "Chốt đơn", value: input.won });

  const conversions: FunnelConv[] = [];
  for (let i = 1; i < stages.length; i++) {
    const a = stages[i - 1];
    const b = stages[i];
    conversions.push({ from: a.key, to: b.key, rate: pct(b.value, a.value), label: `${a.label} → ${b.label}` });
  }

  // Khâu yếu nhất: chỉ so 2 khâu hành động được & cùng thang (lead->qualified,
  // qualified->won). Bỏ reach/engagement->lead vì tỉ lệ luôn nhỏ về bản chất,
  // so sẽ méo.
  const candidates = conversions.filter((c) => c.to === "qualified" || c.to === "won");
  const weakest = candidates.length ? candidates.reduce((w, c) => (c.rate < w.rate ? c : w)) : undefined;

  const findings: Finding[] = [];
  if (input.leads === 0) {
    findings.push({ sentiment: "info", title: "Chưa có lead để dựng phễu", detail: "Đồng bộ Messenger/Lead Ads hoặc import CSV để phân tích tỉ lệ chuyển đổi." });
    return { stages, conversions, weakest, findings };
  }

  const q2w = conversions.find((c) => c.to === "won");
  const l2q = conversions.find((c) => c.to === "qualified");
  if (l2q) {
    findings.push({
      sentiment: l2q.rate >= 40 ? "good" : l2q.rate >= 20 ? "warn" : "bad",
      title: `Lead → chất lượng: ${l2q.rate}%`,
      detail: l2q.rate < 20 ? "Đa số lead là rác/không đạt — siết targeting ads, thêm trường lọc, hoặc đổi thông điệp để hút đúng tệp." : "Tỉ lệ lead đạt chuẩn ở mức chấp nhận được.",
    });
  }
  if (q2w) {
    findings.push({
      sentiment: q2w.rate >= 25 ? "good" : q2w.rate >= 10 ? "warn" : "bad",
      title: `Chất lượng → chốt: ${q2w.rate}%`,
      detail: q2w.rate < 10 ? "Lead đạt chuẩn nhưng chốt kém — vấn đề ở khâu Sale/tư vấn/báo giá, không phải nguồn lead." : "Đội sale đang chốt tốt trên lead chất lượng.",
    });
  }
  if (weakest) {
    findings.push({
      sentiment: "info",
      title: `Khâu rò rỉ lớn nhất: ${weakest.label} (${weakest.rate}%)`,
      detail: "Đây là điểm nghẽn nên ưu tiên xử lý trước để tăng kết quả nhanh nhất.",
    });
  }

  return { stages, conversions, weakest, findings };
}

// ─── Kế hoạch vận hành theo mục tiêu (giao việc cho team) ──────────────

export type TeamArea = "Media" | "Design" | "Content" | "Ads" | "Sale";
export type TaskPriority = "cao" | "vừa" | "thấp";

export interface OpTask {
  area: TeamArea;
  priority: TaskPriority;
  title: string; // brief ngắn giao việc
  why: string; // căn cứ dữ liệu
}

export interface OperatingInput {
  goal: {
    targetFollowers?: number | null;
    targetReachPerWeek?: number | null;
    targetPostsPerWeek?: number | null;
    audienceNote?: string | null;
  } | null;
  dataReal: boolean;
  followPerWeek: number;
  reachPerWeek: number;
  postsPerWeek: number;
  weeksToDeadline: number | null;
  neededFollowPerWeek: number | null;
  onTrackFollowers: boolean | null;
  pillars: PillarAnalysis;
  bestWeekdayLabel?: string;
  goldenHour?: { from: number; to: number };
  funnelWeakest?: { to: string; rate: number } | null;
  junkCampaigns: { name: string; junkRate: number }[];
  newLeadsUncontacted: number;
}

export interface OperatingPlan {
  headline: { status: "ahead" | "on_track" | "behind" | "no_goal" | "no_data"; focus: string };
  recommendedPostsPerWeek: number;
  tasks: OpTask[];
}

const pad = (h: number) => String(h).padStart(2, "0");

/** Sinh kế hoạch vận hành + đầu việc cụ thể để đạt mục tiêu. */
export function buildOperatingPlan(inp: OperatingInput): OperatingPlan {
  const tasks: OpTask[] = [];
  const audience = inp.goal?.audienceNote?.trim() || "tệp mục tiêu";
  const timing =
    inp.bestWeekdayLabel && inp.goldenHour
      ? ` Đăng ${inp.bestWeekdayLabel}, khung ${pad(inp.goldenHour.from)}–${pad((inp.goldenHour.to + 1) % 24)}h.`
      : "";

  // Nhịp đăng khuyến nghị: nền từ mục tiêu, cộng thêm nếu đang chậm.
  const baseCadence = inp.goal?.targetPostsPerWeek ?? 4;
  const behindReach = inp.goal?.targetReachPerWeek ? inp.reachPerWeek < inp.goal.targetReachPerWeek : false;
  const behindFollowers = inp.onTrackFollowers === false;
  const bump = (behindReach ? 1 : 0) + (behindFollowers ? 1 : 0);
  const recommendedPostsPerWeek = Math.max(baseCadence + bump, Math.ceil(inp.postsPerWeek));

  // Trạng thái tổng.
  let status: OperatingPlan["headline"]["status"];
  let focus: string;
  if (!inp.goal || (!inp.goal.targetFollowers && !inp.goal.targetReachPerWeek && !inp.goal.targetPostsPerWeek)) {
    status = "no_goal";
    focus = "Chưa đặt mục tiêu — vào Mục tiêu & Tăng trưởng đặt đích follower/reach + hạn để cố vấn giao việc theo mục tiêu.";
  } else if (!inp.dataReal) {
    status = "no_data";
    focus = "Đã có mục tiêu nhưng chưa đọc được số thật — bấm “Làm mới token trang” ở Cài đặt để cố vấn bám số thật.";
  } else if (behindFollowers) {
    status = "behind";
    focus = `Đang CHẬM tiến độ follower${inp.neededFollowPerWeek ? ` — cần +${inp.neededFollowPerWeek.toLocaleString("vi-VN")}/tuần` : ""}. Dồn lực sản xuất video reach cao + trụ chốt lead.`;
  } else if (inp.onTrackFollowers) {
    status = "on_track";
    focus = "Đúng lộ trình. Giữ nhịp, tối ưu trụ ăn khách và bịt khâu rò rỉ của phễu.";
  } else {
    status = "on_track";
    focus = "Bám mục tiêu — tập trung nội dung đúng tệp và nhịp đăng đều.";
  }

  // ── Đầu việc sản xuất (Media/Design) theo mục tiêu ──
  // 1) Video reach (khi cần tăng follower/reach): định dạng reach tự nhiên cao nhất.
  if (status === "behind" || behindReach) {
    const nReel = Math.max(2, Math.round(recommendedPostsPerWeek * 0.4));
    tasks.push({
      area: "Media",
      priority: "cao",
      title: `Sản xuất ${nReel} reel/video ngắn (15–30s)/tuần — chủ đề "${inp.pillars.bestPerforming?.label ?? "trụ ăn khách"}" cho ${audience}.${timing}`,
      why: `Đang chậm reach/follower; video là định dạng reach tự nhiên cao nhất trên Facebook. Nhịp hiện ${inp.postsPerWeek} bài/tuần, cần ~${recommendedPostsPerWeek}.`,
    });
  }

  // 2) Bổ sung trụ giá trị cao đang thiếu (educational/proof) — Design/Media.
  for (const k of inp.pillars.missingHighValue) {
    if (k === "educational") {
      tasks.push({
        area: "Design",
        priority: "cao",
        title: `Thiết kế 1–2 carousel "Kiến thức/Tips" mỗi tuần (vd food styling, visual marketing F&B) cho ${audience}.`,
        why: "Trụ kiến thức đang thiếu (<15% lịch đăng) — đây là trụ xây uy tín chuyên môn, kéo đúng chủ quán/nhà hàng.",
      });
    } else if (k === "proof") {
      tasks.push({
        area: "Media",
        priority: "cao",
        title: `Dựng 1 case-study/kết quả mỗi tuần (before–after, phản hồi khách) từ dự án gần nhất.`,
        why: "Thiếu trụ case study — nội dung thuyết phục khách B2B mạnh nhất, thiếu nó là mất chuyển đổi.",
      });
    }
  }

  // 3) Cân bằng nếu đang bán hàng quá nhiều.
  if (inp.pillars.dominant?.key === "promotional" && inp.pillars.dominant.sharePct >= 40) {
    tasks.push({
      area: "Content",
      priority: "vừa",
      title: `Giảm tỉ lệ bài bán hàng xuống ~30%, tăng kiến thức + case study.`,
      why: `Bài dịch vụ/ưu đãi đang chiếm ${inp.pillars.dominant.sharePct}% — đăng bán quá nhiều làm chai tệp.`,
    });
  }

  // 4) Bịt khâu rò rỉ của phễu.
  if (inp.funnelWeakest) {
    if (inp.funnelWeakest.to === "qualified") {
      tasks.push({
        area: "Ads",
        priority: "cao",
        title: `Siết targeting + thêm trường lọc (SĐT, nhu cầu) trong form/kịch bản inbox.`,
        why: `Tỉ lệ lead → chất lượng chỉ ${inp.funnelWeakest.rate}% — nhiều lead rác lọt vào, cần lọc từ đầu phễu.`,
      });
    } else if (inp.funnelWeakest.to === "won") {
      tasks.push({
        area: "Sale",
        priority: "cao",
        title: `Chuẩn hoá kịch bản tư vấn + phản hồi nhanh + báo giá rõ ràng.`,
        why: `Lead chất lượng nhưng chốt chỉ ${inp.funnelWeakest.rate}% — nghẽn ở khâu Sale, không phải nguồn lead.`,
      });
    }
  }

  // 5) Tắt/siết campaign ra rác.
  const worstJunk = inp.junkCampaigns.filter((c) => c.junkRate >= 40).slice(0, 3);
  if (worstJunk.length) {
    tasks.push({
      area: "Ads",
      priority: "cao",
      title: `Tắt hoặc siết campaign: ${worstJunk.map((c) => c.name).join(", ")}.`,
      why: `Đang ra rác ≥40% (${worstJunk.map((c) => `${c.name} ${c.junkRate}%`).join(", ")}) — đốt ngân sách vào tệp rác.`,
    });
  }

  // 6) Chăm lead mới chưa liên hệ.
  if (inp.newLeadsUncontacted > 0) {
    tasks.push({
      area: "Sale",
      priority: inp.newLeadsUncontacted >= 10 ? "cao" : "vừa",
      title: `Liên hệ ${inp.newLeadsUncontacted} lead mới chưa chăm sóc trong 48h.`,
      why: "Lead để nguội mất chuyển đổi — phản hồi nhanh tăng tỉ lệ chốt rõ rệt.",
    });
  }

  // 7) Nếu đang đúng lộ trình mà chưa có việc nào -> nhắc giữ nhịp + nhân bản trụ ăn khách.
  if (tasks.length === 0 && inp.pillars.bestPerforming) {
    tasks.push({
      area: "Media",
      priority: "vừa",
      title: `Giữ nhịp ${recommendedPostsPerWeek} bài/tuần, nhân bản dạng "${inp.pillars.bestPerforming.label}".${timing}`,
      why: `Đúng lộ trình; trụ "${inp.pillars.bestPerforming.label}" đang tương tác cao nhất (${inp.pillars.bestPerforming.avg}/bài).`,
    });
  }

  // Xếp theo ưu tiên.
  const rank: Record<TaskPriority, number> = { cao: 0, vừa: 1, thấp: 2 };
  tasks.sort((a, b) => rank[a.priority] - rank[b.priority]);

  return { headline: { status, focus }, recommendedPostsPerWeek, tasks };
}
