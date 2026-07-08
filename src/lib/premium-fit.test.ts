import { describe, it, expect } from "vitest";
import { scanContentSignal, analyzePremiumFit } from "./premium-fit";
import { analyzePillars } from "./marcom";

describe("scanContentSignal", () => {
  it("bắt ngôn ngữ giảm giá vs tư vấn", () => {
    const s = scanContentSignal([
      "Giảm giá sốc 50% hôm nay",
      "Giải pháp visual đồng hành thương hiệu, tăng ROI",
      "Khuyến mãi flash sale",
    ]);
    expect(s.discountDensity).toBeGreaterThan(0.5);
    expect(s.premiumDensity).toBeGreaterThan(0);
  });
});

describe("analyzePremiumFit", () => {
  const massPillars = analyzePillars([
    { message: "Giảm giá sốc gói chụp menu", engagement: 5 },
    { message: "Ưu đãi flash sale combo", engagement: 4 },
    { message: "Inbox nhận giá rẻ", engagement: 3 },
  ]);
  const premiumPillars = analyzePillars([
    { message: "Case study: doanh thu khách tăng sau khi làm visual system", engagement: 80 },
    { message: "Tips xây thương hiệu F&B chuyên nghiệp", engagement: 70 },
    { message: "Giải pháp visual đồng hành cùng chủ quán", engagement: 60 },
  ]);

  it("page giảm giá + broad rác -> band mass, có đầu việc tái định vị", () => {
    const r = analyzePremiumFit({
      icpMinVnd: 25_000_000,
      pillars: massPillars,
      signal: scanContentSignal(["Giảm giá sốc", "Flash sale", "Giá rẻ inbox"]),
      coreJunkRate: null,
      broadJunkRate: 70,
      leadToQualified: 15,
      qualifiedToWon: 5,
      hasData: true,
    });
    expect(r.band).toBe("mass");
    expect(r.score).toBeLessThan(45);
    expect(r.shifts.some((t) => t.title.includes("Tái định vị"))).toBe(true);
    expect(r.shifts.some((t) => t.area === "Ads")).toBe(true);
  });

  it("page chuyên môn + tệp lõi sạch + chốt tốt -> band aligned", () => {
    const r = analyzePremiumFit({
      icpMinVnd: 25_000_000,
      pillars: premiumPillars,
      signal: scanContentSignal(["Giải pháp ROI", "Chiến lược thương hiệu chuyên nghiệp", "Case study hiệu quả"]),
      coreJunkRate: 5,
      broadJunkRate: null,
      leadToQualified: 60,
      qualifiedToWon: 30,
      hasData: true,
    });
    expect(r.band).toBe("aligned");
    expect(r.score).toBeGreaterThanOrEqual(67);
  });

  it("thiếu dữ liệu -> verdict nhắc kết nối", () => {
    const r = analyzePremiumFit({
      icpMinVnd: 25_000_000,
      pillars: analyzePillars([]),
      signal: { discountDensity: 0, premiumDensity: 0 },
      coreJunkRate: null,
      broadJunkRate: null,
      leadToQualified: null,
      qualifiedToWon: null,
      hasData: false,
    });
    expect(r.verdict).toContain("Chưa đủ dữ liệu");
  });
});
