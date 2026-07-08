// Dự báo tháng tới: bao nhiêu inbox Messenger, bao nhiêu lead chất lượng, bao
// nhiêu chốt — theo nhịp lead thực tế × tỉ lệ chuyển đổi lịch sử.
// Thuần logic -> dễ test. Trung thực về độ tin cậy (cần đủ lịch sử mới chắc).

import type { Finding } from "./insights-analysis";

export interface ForecastInput {
  leadsInWindow: number; // tổng lead tạo trong cửa sổ
  messengerInWindow: number; // lead nguồn Messenger trong cửa sổ
  spanDays: number; // khoảng cách thực giữa lead đầu & cuối (đo độ trải)
  windowDays: number; // cửa sổ danh nghĩa (vd 28)
  firstDate?: string | null; // YYYY-MM-DD
  lastDate?: string | null;
  qualifiedRate: number; // 0-1: lead chất lượng / tổng (lịch sử)
  wonRate: number; // 0-1: chốt / tổng (lịch sử)
}

export interface MonthlyForecast {
  confidence: "low" | "medium" | "high";
  monthlyLeads: number;
  monthlyMessenger: number;
  monthlyQualified: number;
  monthlyWon: number;
  perDayLeads: number;
  basisDays: number; // số ngày thực dùng để tính nhịp
  assumptions: string[];
  findings: Finding[];
}

const round = (n: number) => Math.round(n);

export function forecastMonthly(inp: ForecastInput): MonthlyForecast {
  // Dùng KHOẢNG TRẢI THỰC (không chia cho cửa sổ cố định) để không thổi phồng
  // khi lead dồn vào ít ngày. Tối thiểu 1 ngày để tránh chia 0.
  const basisDays = Math.max(1, Math.min(inp.spanDays, inp.windowDays));
  const perDayLeads = inp.leadsInWindow / basisDays;
  const perDayMsg = inp.messengerInWindow / basisDays;

  const monthlyLeads = round(perDayLeads * 30);
  const monthlyMessenger = round(perDayMsg * 30);
  const monthlyQualified = round(monthlyLeads * inp.qualifiedRate);
  const monthlyWon = round(monthlyLeads * inp.wonRate);

  // Độ tin cậy: cần đủ lịch sử TRẢI ĐỀU mới chắc.
  let confidence: MonthlyForecast["confidence"];
  if (inp.spanDays < 5 || inp.leadsInWindow < 8) confidence = "low";
  else if (inp.spanDays >= 14 && inp.leadsInWindow >= 25) confidence = "high";
  else confidence = "medium";

  const assumptions: string[] = [];
  assumptions.push(
    `Dựa trên ${inp.leadsInWindow.toLocaleString("vi-VN")} lead trong ${basisDays} ngày${inp.firstDate && inp.lastDate ? ` (${inp.firstDate} → ${inp.lastDate})` : ""}.`,
  );
  assumptions.push(`Tỉ lệ chốt lịch sử ${Math.round(inp.wonRate * 100)}%, lead chất lượng ${Math.round(inp.qualifiedRate * 100)}%.`);
  assumptions.push("Giả định nhịp & tỉ lệ giữ nguyên; chưa tính mùa vụ hay thay đổi ngân sách ads.");

  const findings: Finding[] = [];
  findings.push({
    sentiment: "info",
    title: `Dự kiến ~${monthlyMessenger.toLocaleString("vi-VN")} inbox & ~${monthlyWon.toLocaleString("vi-VN")} chốt/tháng`,
    detail: `Tổng ~${monthlyLeads.toLocaleString("vi-VN")} lead/tháng, trong đó ~${monthlyQualified.toLocaleString("vi-VN")} lead chất lượng.`,
  });

  if (confidence === "low") {
    findings.push({
      sentiment: "warn",
      title: "Độ tin cậy thấp — cần thêm lịch sử",
      detail:
        inp.spanDays < 5
          ? "Lead đang dồn vào ít ngày (thường do mới import/đồng bộ 1 lần). Bật Đồng bộ định kỳ và để chạy ≥1–2 tuần để dự báo chính xác theo nhịp thật."
          : "Còn ít lead để suy nhịp. Con số chỉ mang tính tham khảo, sẽ chuẩn dần khi tích thêm dữ liệu.",
    });
  } else if (confidence === "high") {
    findings.push({ sentiment: "good", title: "Độ tin cậy cao", detail: "Đủ lịch sử trải đều để dự báo bám nhịp thực tế." });
  }

  if (inp.wonRate === 0 && inp.leadsInWindow > 0) {
    findings.push({
      sentiment: "warn",
      title: "Chưa có đơn chốt trong dữ liệu",
      detail: "Chưa lead nào được đánh dấu 'Chốt đơn' trong CRM — cập nhật trạng thái lead đã chốt để dự báo số chốt chính xác.",
    });
  }

  return { confidence, monthlyLeads, monthlyMessenger, monthlyQualified, monthlyWon, perDayLeads: Math.round(perDayLeads * 10) / 10, basisDays, assumptions, findings };
}
