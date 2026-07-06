// Insight mẫu mô phỏng page Hàng Đôi (28 ngày) — dùng để test & khi chưa kết nối.
import type { PageInsights } from "./facebook/insights";
import type { FbPost } from "./facebook/pages";

const DEMO_POST_MSG = [
  "Bộ ảnh couple phong cách Hàn 🌸 đặt lịch tháng này giảm 20%",
  "Behind the scene buổi chụp cưới hồ Tây 📸",
  "Feedback khách hàng tuần này ❤️",
  "Mini game: tag người yêu nhận voucher chụp đôi 🎁",
  "Bảng giá gói chụp đôi mới cập nhật",
  "Album kỷ niệm 3 năm của anh chị Minh & Hà",
  "Tips tạo dáng chụp đôi tự nhiên",
  "Lịch trống tuần tới — inbox giữ chỗ nhé!",
];

// Bài đăng mẫu 28 ngày (tương tác thật kiểu page couple/photo studio).
export function demoPosts(days = 28): FbPost[] {
  const today = new Date();
  const out: FbPost[] = [];
  // ~ cách 2-3 ngày 1 bài
  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - Math.floor((i * days) / 10));
    const reactions = 20 + ((i * 37) % 120);
    const comments = 3 + ((i * 11) % 25);
    const shares = i % 3 === 0 ? 5 + (i % 7) : i % 5;
    out.push({
      id: `demo_post_${i}`,
      message: DEMO_POST_MSG[i % DEMO_POST_MSG.length],
      created_time: d.toISOString(),
      likes: { summary: { total_count: reactions } },
      comments: { summary: { total_count: comments } },
      shares: { count: shares },
    });
  }
  return out;
}

export function demoInsights(days = 28): PageInsights {
  const today = new Date();
  const series: PageInsights["series"] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const idx = days - 1 - i; // 0..days-1 (cũ -> mới)

    const wave = Math.sin(idx / 2) * 850;
    const trend = idx < days / 2 ? 4300 : 3500; // nửa sau tiếp cận thấp hơn
    const reach = Math.max(800, Math.round(trend + wave + (idx % 3) * 180));
    const engagement = Math.round(reach * (0.06 + (idx % 4) * 0.008));
    const follows = Math.max(0, Math.round(11 + Math.sin(idx) * 6 + (idx % 5) - 1));
    const unfollows = Math.max(0, Math.round(2 + Math.sin(idx / 3) * 1.5 + (idx % 4 === 0 ? 1 : 0)));

    series.push({ date, reach, engagement, follows, unfollows });
  }

  return { fans: 12840, series };
}
