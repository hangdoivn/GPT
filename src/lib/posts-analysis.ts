// Phân tích hiệu quả BÀI ĐĂNG (dữ liệu thật lấy qua pages_read_engagement — không
// cần read_insights). Thay cho page-insights (reach/impressions) đã bị Facebook chặn.

import type { Finding } from "./insights-analysis";
import type { FbPost } from "./facebook/pages";

export interface PostStat {
  id: string;
  date: string; // YYYY-MM-DD
  message: string;
  reactions: number;
  comments: number;
  shares: number;
  engagement: number; // reactions + comments + shares
}

export interface PostsAnalysis {
  totalPosts: number;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  avgEngagement: number;
  cadencePerWeek: number;
  bestPost?: PostStat;
  posts: PostStat[]; // cũ -> mới (cho biểu đồ)
  findings: Finding[];
}

const num = (n?: number) => (typeof n === "number" ? n : 0);

export function analyzePosts(raw: FbPost[], days = 28): PostsAnalysis {
  const cutoff = Date.now() - days * 86400_000;

  const posts: PostStat[] = raw
    .map((p) => {
      const reactions = num(p.likes?.summary?.total_count);
      const comments = num(p.comments?.summary?.total_count);
      const shares = num(p.shares?.count);
      return {
        id: p.id,
        date: (p.created_time ?? "").slice(0, 10),
        message: (p.message ?? "").slice(0, 120),
        reactions,
        comments,
        shares,
        engagement: reactions + comments + shares,
      };
    })
    .filter((p) => {
      const t = Date.parse(p.date);
      return !Number.isNaN(t) && t >= cutoff;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalReactions = posts.reduce((s, p) => s + p.reactions, 0);
  const totalComments = posts.reduce((s, p) => s + p.comments, 0);
  const totalShares = posts.reduce((s, p) => s + p.shares, 0);
  const totalEng = totalReactions + totalComments + totalShares;
  const avgEngagement = posts.length ? Math.round(totalEng / posts.length) : 0;
  const cadencePerWeek = Math.round((posts.length / days) * 7 * 10) / 10;

  const bestPost = posts.reduce<PostStat | undefined>(
    (best, p) => (!best || p.engagement > best.engagement ? p : best),
    undefined,
  );

  const findings: Finding[] = [];

  // Tần suất đăng
  if (posts.length === 0) {
    findings.push({ sentiment: "warn", title: "Chưa có bài đăng trong kỳ", detail: "Đăng đều đặn giúp giữ tương tác và reach tự nhiên." });
  } else if (cadencePerWeek < 2) {
    findings.push({ sentiment: "warn", title: `Đăng thưa (${cadencePerWeek} bài/tuần)`, detail: "E-commerce nên đăng 3–5 bài/tuần để giữ nhịp tiếp cận." });
  } else {
    findings.push({ sentiment: "good", title: `Nhịp đăng tốt (${cadencePerWeek} bài/tuần)`, detail: "Duy trì đều để giữ đà tương tác." });
  }

  // Mức tương tác
  if (posts.length) {
    if (avgEngagement >= 50) {
      findings.push({ sentiment: "good", title: `Tương tác trung bình cao (${avgEngagement}/bài)`, detail: "Nội dung ăn khách — nhân rộng dạng bài đang tốt." });
    } else if (avgEngagement >= 10) {
      findings.push({ sentiment: "info", title: `Tương tác trung bình ${avgEngagement}/bài`, detail: "Ổn. Thử thêm CTA, câu hỏi, mini-game để kéo tương tác." });
    } else {
      findings.push({ sentiment: "warn", title: `Tương tác thấp (${avgEngagement}/bài)`, detail: "Xem lại tiêu đề/hình ảnh 3 giây đầu và độ liên quan với tệp khách." });
    }
  }

  // Chia sẻ (lan toả)
  if (totalShares > 0 && totalEng > 0) {
    const shareRate = Math.round((totalShares / totalEng) * 100);
    if (shareRate >= 10)
      findings.push({ sentiment: "good", title: `Tỉ lệ chia sẻ tốt (${shareRate}%)`, detail: "Nội dung được lan toả thật — dấu hiệu tệp chất lượng." });
  }

  // Bài tốt nhất
  if (bestPost && bestPost.engagement > 0) {
    findings.push({
      sentiment: "info",
      title: `Bài tốt nhất: ${bestPost.engagement} tương tác (${bestPost.date})`,
      detail: bestPost.message ? `"${bestPost.message}${bestPost.message.length >= 120 ? "…" : ""}" — xem lại công thức để nhân rộng.` : "Xem lại bài này để nhân rộng công thức.",
    });
  }

  return {
    totalPosts: posts.length,
    totalReactions,
    totalComments,
    totalShares,
    avgEngagement,
    cadencePerWeek,
    bestPost,
    posts,
    findings,
  };
}
