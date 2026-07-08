import { describe, it, expect } from "vitest";
import { classifyPillar, analyzePillars, analyzeFunnel, buildOperatingPlan, stripDiacritics, type PillarAnalysis } from "./marcom";

describe("classifyPillar", () => {
  it("nhận diện trụ kiến thức", () => {
    expect(classifyPillar("5 tips food styling cho quán cafe")).toBe("educational");
    expect(classifyPillar("Bí quyết chụp món ăn đẹp")).toBe("educational");
  });
  it("nhận diện case study", () => {
    expect(classifyPillar("Case study: kết quả sau 3 tháng cho khách hàng nhà hàng X")).toBe("proof");
    expect(classifyPillar("Before after bộ ảnh menu")).toBe("proof");
  });
  it("nhận diện bán hàng", () => {
    expect(classifyPillar("Báo giá gói chụp menu, inbox để nhận ưu đãi")).toBe("promotional");
  });
  it("không rõ -> other", () => {
    expect(classifyPillar("Chào buổi sáng")).toBe("other");
  });
  it("bỏ dấu ổn định", () => {
    expect(stripDiacritics("Đà Nẵng")).toBe("da nang");
  });
});

describe("analyzePillars", () => {
  it("phát hiện thiếu trụ giá trị cao", () => {
    const posts = [
      { message: "Báo giá dịch vụ chụp menu", engagement: 10 },
      { message: "Ưu đãi combo chụp món", engagement: 8 },
      { message: "Inbox đặt lịch ngay", engagement: 5 },
      { message: "Khuyến mãi tháng này", engagement: 6 },
    ];
    const r = analyzePillars(posts);
    expect(r.missingHighValue).toContain("educational");
    expect(r.missingHighValue).toContain("proof");
    expect(r.findings.some((f) => f.title.includes("bán hàng quá nhiều"))).toBe(true);
  });

  it("tìm trụ ăn khách nhất theo tương tác/bài", () => {
    const posts = [
      { message: "Tips visual F&B", engagement: 100 },
      { message: "Mẹo chụp món", engagement: 90 },
      { message: "Báo giá dịch vụ", engagement: 5 },
    ];
    const r = analyzePillars(posts);
    expect(r.bestPerforming?.key).toBe("educational");
  });
});

describe("analyzeFunnel", () => {
  it("tính tỉ lệ chuyển đổi + khâu yếu nhất", () => {
    const r = analyzeFunnel({ reachPerWeek: 50000, engagementPerWeek: 2000, leads: 100, qualified: 30, won: 3 });
    const l2q = r.conversions.find((c) => c.to === "qualified");
    const q2w = r.conversions.find((c) => c.to === "won");
    expect(l2q?.rate).toBe(30);
    expect(q2w?.rate).toBe(10);
    expect(r.weakest?.to).toBe("won"); // 10% là thấp nhất trong nhóm sau-lead
  });

  it("không có lead -> báo cần dữ liệu", () => {
    const r = analyzeFunnel({ leads: 0, qualified: 0, won: 0 });
    expect(r.findings.some((f) => f.title.includes("Chưa có lead"))).toBe(true);
  });
});

describe("buildOperatingPlan — giao việc theo mục tiêu", () => {
  const pillars: PillarAnalysis = analyzePillars([
    { message: "Báo giá dịch vụ chụp menu", engagement: 10 },
    { message: "Ưu đãi combo", engagement: 8 },
    { message: "Inbox đặt lịch", engagement: 6 },
  ]);

  it("chưa đặt mục tiêu -> status no_goal", () => {
    const plan = buildOperatingPlan({
      goal: null, dataReal: true, followPerWeek: 0, reachPerWeek: 0, postsPerWeek: 0,
      weeksToDeadline: null, neededFollowPerWeek: null, onTrackFollowers: null,
      pillars, junkCampaigns: [], newLeadsUncontacted: 0,
    });
    expect(plan.headline.status).toBe("no_goal");
  });

  it("chậm tiến độ -> giao Media sản xuất video reach + bổ sung trụ thiếu", () => {
    const plan = buildOperatingPlan({
      goal: { targetFollowers: 20000, targetReachPerWeek: 50000, targetPostsPerWeek: 4, audienceNote: "chủ quán F&B Đà Nẵng" },
      dataReal: true, followPerWeek: 50, reachPerWeek: 10000, postsPerWeek: 2,
      weeksToDeadline: 20, neededFollowPerWeek: 200, onTrackFollowers: false,
      pillars, bestWeekdayLabel: "Thứ 5", goldenHour: { from: 20, to: 22 },
      funnelWeakest: { to: "qualified", rate: 15 },
      junkCampaigns: [{ name: "Broad FnB", junkRate: 60 }],
      newLeadsUncontacted: 12,
    });
    expect(plan.headline.status).toBe("behind");
    expect(plan.recommendedPostsPerWeek).toBeGreaterThanOrEqual(5); // 4 + bump reach + bump follower
    const areas = plan.tasks.map((t) => t.area);
    expect(areas).toContain("Media"); // video reach
    expect(areas).toContain("Design"); // carousel kiến thức (thiếu educational)
    expect(areas).toContain("Ads"); // tắt campaign rác + siết targeting
    expect(areas).toContain("Sale"); // chăm 12 lead mới
    // task cao ưu tiên đứng trước
    expect(plan.tasks[0].priority).toBe("cao");
  });

  it("dataReal=false -> status no_data, không giao việc bám số demo", () => {
    const plan = buildOperatingPlan({
      goal: { targetFollowers: 20000 }, dataReal: false, followPerWeek: 0, reachPerWeek: 0, postsPerWeek: 0,
      weeksToDeadline: null, neededFollowPerWeek: null, onTrackFollowers: null,
      pillars, junkCampaigns: [], newLeadsUncontacted: 0,
    });
    expect(plan.headline.status).toBe("no_data");
  });
});
