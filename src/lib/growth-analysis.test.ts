import { describe, it, expect } from "vitest";
import { analyzeBestTime, projectGrowth, type GrowthSeriesLite } from "./growth-analysis";
import type { FbPost } from "./facebook/pages";

function post(id: string, created: string, reactions: number): FbPost {
  return {
    id,
    created_time: created,
    message: "x",
    likes: { summary: { total_count: reactions } },
    comments: { summary: { total_count: 0 } },
    shares: { count: 0 },
  };
}

describe("analyzeBestTime", () => {
  it("thiếu dữ liệu -> hasData=false", () => {
    const r = analyzeBestTime([post("1", "2026-07-01T10:00:00+0000", 5)]);
    expect(r.hasData).toBe(false);
  });

  it("tìm ra thứ tốt nhất theo tương tác trung bình", () => {
    // 2026-07-06 là Thứ 2. Tương tác cao vào Thứ 2.
    const posts = [
      post("1", "2026-07-06T03:00:00+0000", 100), // T2 (10h VN)
      post("2", "2026-07-07T03:00:00+0000", 10), // T3
      post("3", "2026-07-08T03:00:00+0000", 10), // T4
    ];
    const r = analyzeBestTime(posts);
    expect(r.hasData).toBe(true);
    expect(r.bestWeekday?.label).toBe("Thứ 2");
  });

  it("giờ VN = UTC+7 (03:00 UTC -> 10h VN)", () => {
    const posts = [
      post("1", "2026-07-06T03:00:00+0000", 50),
      post("2", "2026-07-07T03:00:00+0000", 50),
      post("3", "2026-07-08T03:00:00+0000", 50),
    ];
    const r = analyzeBestTime(posts);
    // giờ 10 VN phải có tương tác
    expect(r.byHour[10].engagement).toBeGreaterThan(0);
    expect(r.byHour[3].engagement).toBe(0);
  });
});

describe("projectGrowth", () => {
  const series: GrowthSeriesLite = { days: 28, netFollows: 400, reachTotal: 40000, posts: 12 };
  const now = Date.parse("2026-07-07T00:00:00Z");

  it("chưa đặt mục tiêu -> hasGoal=false", () => {
    const r = projectGrowth(null, 10000, series, now);
    expect(r.hasGoal).toBe(false);
    expect(r.followPerWeek).toBe(100); // 400/4 tuần
  });

  it("đúng lộ trình khi nhịp đủ", () => {
    // đích 12000, hiện 10000, còn ~10 tuần, nhịp +100/tuần -> dự phóng 11000 < 12000 -> chậm
    const r = projectGrowth(
      { targetFollowers: 12000, deadline: "2026-09-15" },
      10000,
      series,
      now,
    );
    expect(r.hasGoal).toBe(true);
    expect(r.onTrackFollowers).toBe(false);
    expect(r.neededFollowPerWeek).toBeGreaterThan(100);
  });

  it("đạt mục tiêu khi đích thấp hơn hiện tại", () => {
    const r = projectGrowth({ targetFollowers: 9000 }, 10000, series, now);
    expect(r.onTrackFollowers).toBe(true);
    expect(r.followGap).toBeLessThanOrEqual(0);
  });

  it("dùng baseline để tính nhịp chính xác hơn", () => {
    // baseline 9000 cách nay 4 tuần, hiện 10000 -> +250/tuần
    const r = projectGrowth(
      { targetFollowers: 12000, deadline: "2026-09-15", baselineFollowers: 9000, baselineAt: "2026-06-09T00:00:00Z" },
      10000,
      series,
      now,
    );
    expect(r.followPerWeek).toBe(250);
  });

  it("dataReal=false -> KHÔNG bịa dự phóng từ số demo", () => {
    const r = projectGrowth({ targetFollowers: 5000 }, 12840, series, now, false);
    expect(r.followPerWeek).toBe(0);
    expect(r.reachPerWeek).toBe(0);
    expect(r.projectedFollowers).toBeUndefined();
    expect(r.onTrackFollowers).toBeUndefined(); // không hiện "đã đạt mục tiêu" giả
    expect(r.findings.some((f) => f.title.includes("số liệu thật"))).toBe(true);
  });

  it("deadline còn vài giờ KHÔNG bị coi là 'đã tới hạn'", () => {
    // hạn 6h sau now -> phải vẫn dự phóng, không rơi vào nhánh 'đã tới hạn'
    const r = projectGrowth(
      { targetFollowers: 12000, deadline: "2026-07-07T06:00:00Z" },
      10000,
      series,
      Date.parse("2026-07-07T00:00:00Z"),
    );
    expect(r.findings.some((f) => f.title.includes("Đã tới hạn"))).toBe(false);
    expect(r.projectedFollowers).not.toBeUndefined();
  });

  it("deadline đã qua -> 'đã tới hạn'", () => {
    const r = projectGrowth(
      { targetFollowers: 12000, deadline: "2026-07-06T00:00:00Z" },
      10000,
      series,
      Date.parse("2026-07-07T00:00:00Z"),
    );
    expect(r.findings.some((f) => f.title.includes("Đã tới hạn"))).toBe(true);
  });
});

describe("analyzeBestTime — không gợi ý thứ khi 0 tương tác", () => {
  it("tất cả bài 0 tương tác -> không có finding 'đăng tốt nhất'", () => {
    const posts = [
      post("1", "2026-07-06T03:00:00+0000", 0),
      post("2", "2026-07-07T03:00:00+0000", 0),
      post("3", "2026-07-08T03:00:00+0000", 0),
    ];
    const r = analyzeBestTime(posts);
    expect(r.hasData).toBe(true);
    expect(r.findings.some((f) => f.title.includes("Đăng tốt nhất"))).toBe(false);
  });
});
