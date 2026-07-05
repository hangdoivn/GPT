import { describe, it, expect } from "vitest";
import { evaluateAudience, type AudienceInput, type BucketStat } from "./audience-eval";

const bucket = (b: BucketStat["bucket"], junkRate: number, total = 40, wonRate = 10): BucketStat => ({
  bucket: b,
  label: b,
  total,
  junk: Math.round((junkRate / 100) * total),
  junkRate,
  wonRate,
});

const base: AudienceInput = {
  junkRate: 20,
  buckets: [bucket("broad", 30), bucket("core", 12), bucket("engager", 15)],
  engagementRate: 5,
  reachTrendPct: 0,
  fanAddsNet: 100,
  churnRatio: 0.2,
  followers: 12000,
};

describe("evaluateAudience", () => {
  it("broad rác cao + tệp lõi sạch -> sửa ads, KHÔNG page mới", () => {
    const r = evaluateAudience({
      ...base,
      junkRate: 45,
      buckets: [bucket("broad", 80), bucket("core", 12), bucket("engager", 20)],
    });
    expect(r.verdict).toBe("fix_ads");
    expect(r.diagnosis.targetingExcess).toBeGreaterThan(30);
  });

  it("tệp khoẻ -> giữ page", () => {
    const r = evaluateAudience(base);
    expect(r.verdict).toBe("keep_page");
    expect(r.band).toBe("healthy");
  });

  it("account bị hạn chế (red-line) -> ép điểm thấp + page mới", () => {
    const r = evaluateAudience({ ...base, accountRestricted: true });
    expect(r.redLine).toBe(true);
    expect(r.score).toBeLessThanOrEqual(39);
    expect(r.verdict).toBe("new_page");
  });

  it("tệp bẩn tận lõi -> điểm thấp, không phải giữ page", () => {
    const r = evaluateAudience({
      ...base,
      junkRate: 70,
      engagementRate: 0.5,
      fanAddsNet: -50,
      churnRatio: 1.2,
      buckets: [bucket("broad", 75), bucket("core", 65), bucket("engager", 70)],
    });
    expect(r.score).toBeLessThan(40);
    expect(r.verdict).toBe("new_page");
  });

  it("mức trung bình -> detox làm sạch tệp", () => {
    const r = evaluateAudience({
      ...base,
      junkRate: 50,
      engagementRate: 2,
      buckets: [bucket("broad", 50), bucket("core", 35), bucket("engager", 45)],
    });
    expect(r.verdict).toBe("clean_audience");
  });

  it("chưa kết nối FB -> confidence không phải high, có nhắc kết nối", () => {
    const r = evaluateAudience(base);
    expect(r.confidence).not.toBe("high");
    expect(r.signals.some((s) => s.title.includes("Nhân khẩu"))).toBe(true);
  });
});
