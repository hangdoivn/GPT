import { describe, it, expect } from "vitest";
import { forecastMonthly } from "./forecast";

describe("forecastMonthly", () => {
  it("dự báo theo nhịp trải đều -> tin cậy cao", () => {
    // 56 lead trong 28 ngày = 2/ngày = 60/tháng; 70% messenger; chốt 10%
    const r = forecastMonthly({
      leadsInWindow: 56, messengerInWindow: 42, spanDays: 28, windowDays: 28,
      qualifiedRate: 0.4, wonRate: 0.1, firstDate: "2026-06-10", lastDate: "2026-07-07",
    });
    expect(r.confidence).toBe("high");
    expect(r.monthlyLeads).toBe(60);
    expect(r.monthlyMessenger).toBe(45); // 42/28*30
    expect(r.monthlyWon).toBe(6); // 60*0.1
    expect(r.monthlyQualified).toBe(24); // 60*0.4
  });

  it("lead dồn vào ít ngày -> tin cậy thấp + cảnh báo đồng bộ", () => {
    const r = forecastMonthly({
      leadsInWindow: 500, messengerInWindow: 500, spanDays: 1, windowDays: 28,
      qualifiedRate: 0.2, wonRate: 0.05,
    });
    expect(r.confidence).toBe("low");
    expect(r.findings.some((f) => f.title.includes("tin cậy thấp"))).toBe(true);
    // basisDays tối thiểu 1 nhưng cảnh báo rõ là không đáng tin
    expect(r.basisDays).toBe(1);
  });

  it("chưa có chốt -> cảnh báo cập nhật CRM", () => {
    const r = forecastMonthly({
      leadsInWindow: 30, messengerInWindow: 20, spanDays: 20, windowDays: 28,
      qualifiedRate: 0.3, wonRate: 0,
    });
    expect(r.monthlyWon).toBe(0);
    expect(r.findings.some((f) => f.title.includes("Chưa có đơn chốt"))).toBe(true);
  });
});
