// Engine chấm điểm chất lượng lead — trái tim của app.
// Mục tiêu: tự động phát hiện "tệp rác" để đội sale không mất thời gian gọi số ảo.
//
// Cách tính: bắt đầu 100 điểm, trừ dần theo từng dấu hiệu xấu.
// Kết quả gồm: điểm (0-100), phân loại (good/warm/junk), và danh sách lý do.

import { checkPhone } from "./phone";

export type Quality = "good" | "warm" | "junk";

export interface LeadInput {
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  province?: string | null;
  message?: string | null;
  source?: string | null;
}

export interface ScoreResult {
  score: number;
  quality: Quality;
  reasons: string[]; // lý do trừ điểm (giải thích tại sao rác)
}

// Từ khoá spam thường gặp trong tên/nội dung lead rác.
const SPAM_KEYWORDS = [
  "test", "abc", "xyz", "asdf", "qwer", "aaa", "nnn", "haha",
  "loz", "vcl", "vãi", "spam", "shipper", "không mua", "hỏi cho biết",
];

// Tên rõ ràng là giả.
const FAKE_NAME_PATTERNS = [
  /^[a-z]{1,2}$/i, // 1-2 ký tự
  /^(.)\1{2,}$/, // aaaa, kkkk
  /^\d+$/, // toàn số
  /^[^a-zA-ZÀ-ỹ]+$/, // không có chữ cái nào
];

// Tên mặc định Facebook trả về khi khách nhắn tin mà không để lại tên thật.
// Không có giá trị nhận diện — coi như không có tên thật.
const PLACEHOLDER_NAME_PATTERNS = [
  /^ngư[oờ]i dùng facebook$/i,
  /^ngư[oờ]i dùng$/i,
  /^\(?khách messenger\)?$/i, // fallback nội bộ khi Messenger không có tên
  /^facebook user$/i,
  /^fb user$/i,
  /^khách( hàng)?$/i,
  /^guest$/i,
  /^user$/i,
];

function isPlaceholderName(name: string): boolean {
  return PLACEHOLDER_NAME_PATTERNS.some((re) => re.test(name.trim()));
}

const NAME_MIN_LEN = 2;

/**
 * Chấm điểm một lead. Thuần logic, không phụ thuộc DB — dễ test.
 */
export function scoreLead(input: LeadInput): ScoreResult {
  const reasons: string[] = [];
  let score = 100;

  const name = (input.fullName ?? "").trim();
  const message = (input.message ?? "").trim().toLowerCase();

  // 1) Số điện thoại — yếu tố nặng nhất.
  // SĐT không liên lạc được = tệp rác. Trừ đủ nặng để tự rơi xuống nhóm "junk".
  const phone = checkPhone(input.phone);
  if (!input.phone) {
    score -= 55;
    reasons.push("Không có số điện thoại");
  } else if (!phone.valid) {
    score -= 60;
    reasons.push(`SĐT không hợp lệ: ${phone.reason}`);
  }

  // 2) Tên khách.
  if (!name) {
    score -= 20;
    reasons.push("Không có tên");
  } else if (isPlaceholderName(name)) {
    // Tên mặc định Facebook ("Người dùng Facebook"): khách chưa để lại tên thật.
    // Trừ đủ nặng để khi cũng không có SĐT thì tự rơi xuống "rác".
    score -= 25;
    reasons.push("Tên mặc định Facebook (khách chưa để lại tên/SĐT thật)");
  } else if (name.length < NAME_MIN_LEN) {
    score -= 15;
    reasons.push("Tên quá ngắn");
  } else if (FAKE_NAME_PATTERNS.some((re) => re.test(name))) {
    score -= 25;
    reasons.push("Tên có dấu hiệu giả/ngẫu nhiên");
  }

  // 3) Từ khoá spam trong tên hoặc nội dung.
  const haystack = `${name.toLowerCase()} ${message}`;
  const hitSpam = SPAM_KEYWORDS.filter((k) => haystack.includes(k));
  if (hitSpam.length > 0) {
    score -= 15 * hitSpam.length;
    reasons.push(`Chứa từ khoá spam: ${hitSpam.join(", ")}`);
  }

  // 4) Email rác (nếu có khai email).
  if (input.email) {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      score -= 10;
      reasons.push("Email sai định dạng");
    } else if (/(test|fake|no|none|abc)@/.test(email)) {
      score -= 8;
      reasons.push("Email có dấu hiệu giả");
    }
  }

  // 5) Không có tỉnh/thành — khó giao hàng, thường là lead vãng lai.
  if (!input.province || !input.province.trim()) {
    score -= 5;
    reasons.push("Không khai tỉnh/thành");
  }

  // Kẹp về [0, 100].
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    quality: classify(score),
    reasons,
  };
}

export function classify(score: number): Quality {
  if (score >= 70) return "good";
  if (score >= 40) return "warm";
  return "junk";
}

export const QUALITY_LABEL: Record<Quality, string> = {
  good: "Chất lượng",
  warm: "Cần xác minh",
  junk: "Rác",
};
