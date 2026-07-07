// Phân tích tăng trưởng & tối ưu reach:
//  - Thời điểm đăng tốt nhất (theo thứ + giờ, giờ Việt Nam UTC+7).
//  - Dự phóng đạt mục tiêu follower/reach theo số lượng & thời gian.
// Thuần logic (không phụ thuộc DB/FB) -> dễ test.

import type { Finding } from "./insights-analysis";
import type { FbPost } from "./facebook/pages";

const VN_OFFSET_MS = 7 * 3600 * 1000; // UTC+7
const WEEKDAY_VI = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export interface WeekdayStat {
  weekday: number; // 0=CN
  label: string;
  posts: number;
  engagement: number;
  avg: number; // engagement/bài
}
export interface HourStat {
  hour: number; // 0-23 giờ VN
  posts: number;
  engagement: number;
}
export interface BestTime {
  hasData: boolean;
  byWeekday: WeekdayStat[];
  byHour: HourStat[];
  bestWeekday?: WeekdayStat;
  bestHourWindow?: { from: number; to: number; engagement: number };
  findings: Finding[];
}

const num = (n?: number) => (typeof n === "number" ? n : 0);
const engOf = (p: FbPost) =>
  num(p.likes?.summary?.total_count) + num(p.comments?.summary?.total_count) + num(p.shares?.count);

/** Chuyển created_time (ISO, thường +0000) sang thứ & giờ theo giờ VN. */
function vnParts(created?: string): { weekday: number; hour: number } | null {
  if (!created) return null;
  const ms = Date.parse(created);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms + VN_OFFSET_MS);
  return { weekday: d.getUTCDay(), hour: d.getUTCHours() };
}

/** Phân tích thời điểm đăng hiệu quả nhất từ bài đăng thật. */
export function analyzeBestTime(posts: FbPost[]): BestTime {
  const wd: WeekdayStat[] = WEEKDAY_VI.map((label, weekday) => ({ weekday, label, posts: 0, engagement: 0, avg: 0 }));
  const hr: HourStat[] = Array.from({ length: 24 }, (_, hour) => ({ hour, posts: 0, engagement: 0 }));

  let counted = 0;
  for (const p of posts) {
    const parts = vnParts(p.created_time);
    if (!parts) continue;
    const e = engOf(p);
    wd[parts.weekday].posts++;
    wd[parts.weekday].engagement += e;
    hr[parts.hour].posts++;
    hr[parts.hour].engagement += e;
    counted++;
  }
  for (const w of wd) w.avg = w.posts ? Math.round(w.engagement / w.posts) : 0;

  const findings: Finding[] = [];
  if (counted < 3) {
    return { hasData: false, byWeekday: wd, byHour: hr, findings: [
      { sentiment: "info", title: "Chưa đủ bài để phân tích thời điểm", detail: "Cần ít nhất 3–5 bài trong kỳ để gợi ý thứ/giờ đăng tốt nhất." },
    ] };
  }

  // Thứ tốt nhất (theo engagement trung bình/bài, chỉ xét thứ có bài).
  const bestWeekday = [...wd].filter((w) => w.posts > 0).sort((a, b) => b.avg - a.avg)[0];

  // Khung giờ tốt nhất: cửa sổ 3 giờ có tổng engagement cao nhất.
  let bestHourWindow: BestTime["bestHourWindow"];
  let bestSum = -1;
  for (let h = 0; h < 24; h++) {
    const s = hr[h].engagement + hr[(h + 1) % 24].engagement + hr[(h + 2) % 24].engagement;
    if (s > bestSum) {
      bestSum = s;
      bestHourWindow = { from: h, to: (h + 2) % 24, engagement: s };
    }
  }

  if (bestWeekday && bestWeekday.avg > 0) {
    findings.push({
      sentiment: "good",
      title: `Đăng tốt nhất vào ${bestWeekday.label}`,
      detail: `Bài đăng ${bestWeekday.label} đạt trung bình ${bestWeekday.avg} tương tác/bài — cao nhất tuần. Ưu tiên xếp bài quan trọng vào ngày này.`,
    });
  }
  if (bestHourWindow && bestHourWindow.engagement > 0) {
    findings.push({
      sentiment: "info",
      title: `Khung giờ vàng: ${pad(bestHourWindow.from)}–${pad((bestHourWindow.to + 1) % 24)}h`,
      detail: "Khung 3 giờ gom nhiều tương tác nhất (giờ Việt Nam). Lên lịch đăng quanh khung này để tối đa reach.",
    });
  }

  return { hasData: true, byWeekday: wd, byHour: hr, bestWeekday, bestHourWindow, findings };
}

const pad = (h: number) => String(h).padStart(2, "0");

// ─── Dự phóng đạt mục tiêu ────────────────────────────────────────────

export interface GoalInput {
  targetFollowers?: number | null;
  targetReachPerWeek?: number | null;
  targetPostsPerWeek?: number | null;
  deadline?: string | null; // ISO
  baselineFollowers?: number | null;
  baselineAt?: string | null; // ISO
}

export interface GrowthProjection {
  hasGoal: boolean;
  // follower
  currentFollowers: number;
  targetFollowers?: number | null;
  followPerWeek: number; // nhịp tăng ròng/tuần hiện tại
  weeksToDeadline?: number | null;
  projectedFollowers?: number | null; // dự phóng tại hạn
  followGap?: number | null; // còn thiếu bao nhiêu
  neededFollowPerWeek?: number | null; // cần tăng bao nhiêu/tuần để kịp
  onTrackFollowers?: boolean | null;
  // reach & nhịp đăng
  reachPerWeek: number;
  targetReachPerWeek?: number | null;
  postsPerWeek: number;
  targetPostsPerWeek?: number | null;
  findings: Finding[];
}

export interface GrowthSeriesLite {
  days: number;
  netFollows: number; // follows - unfollows trong kỳ
  reachTotal: number;
  posts: number;
}

const round = (n: number) => Math.round(n);

/**
 * Dự phóng đạt mục tiêu từ nhịp hiện tại.
 * `dataReal=false` (chưa có số liệu thật) -> KHÔNG bịa dự phóng từ số demo,
 * chỉ nhắc kết nối. Tránh hiện "đã đạt mục tiêu" giả.
 */
export function projectGrowth(
  goal: GoalInput | null,
  currentFollowers: number,
  s: GrowthSeriesLite,
  now: number,
  dataReal = true,
): GrowthProjection {
  const hasTargets = !!goal && (!!goal.targetFollowers || !!goal.targetReachPerWeek || !!goal.targetPostsPerWeek);

  if (!dataReal) {
    return {
      hasGoal: hasTargets,
      currentFollowers: 0,
      targetFollowers: goal?.targetFollowers ?? null,
      followPerWeek: 0,
      reachPerWeek: 0,
      postsPerWeek: 0,
      targetReachPerWeek: goal?.targetReachPerWeek ?? null,
      targetPostsPerWeek: goal?.targetPostsPerWeek ?? null,
      findings: [
        {
          sentiment: "info",
          title: "Chưa có số liệu thật để dự phóng",
          detail:
            "Kết nối Facebook và bấm “Làm mới token trang” ở Cài đặt để app đọc follower/reach thật, rồi dự phóng theo số lượng & thời gian. Mục tiêu vẫn được lưu.",
        },
      ],
    };
  }

  const weeks = s.days > 0 ? s.days / 7 : 1;
  const followPerWeek = round(s.netFollows / weeks);
  const reachPerWeek = round(s.reachTotal / weeks);
  const postsPerWeek = Math.round((s.posts / weeks) * 10) / 10;

  const findings: Finding[] = [];
  if (!goal || (!goal.targetFollowers && !goal.targetReachPerWeek && !goal.targetPostsPerWeek)) {
    findings.push({
      sentiment: "info",
      title: "Chưa đặt mục tiêu",
      detail: "Đặt đích số follower + hạn hoàn thành để app dự phóng và gợi ý nhịp đăng/tăng follow cần thiết.",
    });
    return { hasGoal: false, currentFollowers, followPerWeek, reachPerWeek, postsPerWeek, findings };
  }

  // Nhịp follow chính xác hơn nếu có baseline từ lúc đặt mục tiêu.
  let effectiveFollowPerWeek = followPerWeek;
  if (goal.baselineFollowers != null && goal.baselineAt) {
    const bMs = Date.parse(goal.baselineAt);
    if (!Number.isNaN(bMs) && now > bMs) {
      const wk = (now - bMs) / (7 * 86400_000);
      if (wk >= 0.5) effectiveFollowPerWeek = round((currentFollowers - goal.baselineFollowers) / wk);
    }
  }

  // Giá trị CHÍNH XÁC cho tính toán/điều kiện; chỉ làm tròn khi hiển thị.
  let weeksExact: number | null = null; // >0 nghĩa là chưa tới hạn (dù còn vài giờ)
  let weeksToDeadline: number | null = null;
  let deadlinePassed = false;
  if (goal.deadline) {
    const dMs = Date.parse(goal.deadline);
    if (!Number.isNaN(dMs)) {
      weeksExact = (dMs - now) / (7 * 86400_000);
      deadlinePassed = dMs <= now;
      weeksToDeadline = Math.max(0, Math.round(weeksExact * 10) / 10);
    }
  }

  const out: GrowthProjection = {
    hasGoal: true,
    currentFollowers,
    targetFollowers: goal.targetFollowers ?? null,
    followPerWeek: effectiveFollowPerWeek,
    weeksToDeadline,
    reachPerWeek,
    targetReachPerWeek: goal.targetReachPerWeek ?? null,
    postsPerWeek,
    targetPostsPerWeek: goal.targetPostsPerWeek ?? null,
    findings,
  };

  // Follower projection
  if (goal.targetFollowers) {
    const gap = goal.targetFollowers - currentFollowers;
    out.followGap = gap;
    if (gap <= 0) {
      findings.push({ sentiment: "good", title: "Đã đạt mục tiêu follower 🎉", detail: `Hiện ${currentFollowers.toLocaleString("vi-VN")} ≥ đích ${goal.targetFollowers.toLocaleString("vi-VN")}. Đặt mục tiêu mới cao hơn.` });
      out.onTrackFollowers = true;
      out.projectedFollowers = currentFollowers;
    } else if (weeksExact != null && !deadlinePassed) {
      const projected = round(currentFollowers + effectiveFollowPerWeek * weeksExact);
      const needed = Math.ceil(gap / weeksExact);
      out.projectedFollowers = projected;
      out.neededFollowPerWeek = needed;
      out.onTrackFollowers = projected >= goal.targetFollowers;
      if (out.onTrackFollowers) {
        findings.push({ sentiment: "good", title: `Đúng lộ trình: dự phóng ~${projected.toLocaleString("vi-VN")} follower đúng hạn`, detail: `Nhịp hiện tại +${effectiveFollowPerWeek}/tuần đủ để đạt ${goal.targetFollowers.toLocaleString("vi-VN")}. Giữ vững.` });
      } else {
        findings.push({ sentiment: "bad", title: `Chậm tiến độ: cần +${needed.toLocaleString("vi-VN")} follower/tuần`, detail: `Nhịp hiện tại chỉ +${effectiveFollowPerWeek}/tuần → dự phóng ~${projected.toLocaleString("vi-VN")}, thiếu so với đích ${goal.targetFollowers.toLocaleString("vi-VN")}. Tăng nhịp đăng, đẩy bài lan toả, hoặc chạy ads đúng tệp.` });
      }
    } else if (deadlinePassed) {
      findings.push({ sentiment: "warn", title: "Đã tới hạn mục tiêu", detail: `Còn thiếu ${gap.toLocaleString("vi-VN")} follower. Đặt lại hạn mới hoặc điều chỉnh đích.` });
    } else {
      const wkNeeded = effectiveFollowPerWeek > 0 ? Math.ceil(gap / effectiveFollowPerWeek) : null;
      findings.push({ sentiment: "info", title: "Chưa đặt hạn hoàn thành", detail: wkNeeded ? `Với nhịp +${effectiveFollowPerWeek}/tuần, cần ~${wkNeeded} tuần để đạt đích. Đặt hạn để theo dõi sát hơn.` : "Đặt hạn hoàn thành để app dự phóng." });
    }
  }

  // Reach target
  if (goal.targetReachPerWeek) {
    if (reachPerWeek >= goal.targetReachPerWeek) {
      findings.push({ sentiment: "good", title: `Đạt đích reach/tuần (${reachPerWeek.toLocaleString("vi-VN")})`, detail: `Vượt mốc ${goal.targetReachPerWeek.toLocaleString("vi-VN")}. Duy trì nội dung đang hiệu quả.` });
    } else {
      const short = goal.targetReachPerWeek - reachPerWeek;
      findings.push({ sentiment: "warn", title: `Reach/tuần đang ${reachPerWeek.toLocaleString("vi-VN")}, thiếu ${short.toLocaleString("vi-VN")}`, detail: "Tăng tần suất đăng + đăng đúng khung giờ vàng + làm reel/video ngắn để đẩy reach tự nhiên." });
    }
  }

  // Posts cadence target
  if (goal.targetPostsPerWeek) {
    if (postsPerWeek >= goal.targetPostsPerWeek) {
      findings.push({ sentiment: "good", title: `Đủ nhịp đăng (${postsPerWeek} bài/tuần)`, detail: "Giữ đều để nuôi reach tự nhiên." });
    } else {
      findings.push({ sentiment: "warn", title: `Đăng thưa: ${postsPerWeek}/${goal.targetPostsPerWeek} bài/tuần`, detail: `Cần thêm ~${Math.ceil(goal.targetPostsPerWeek - postsPerWeek)} bài/tuần để đạt nhịp mục tiêu.` });
    }
  }

  return out;
}
