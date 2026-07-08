import { describe, it, expect } from "vitest";
import { analyzeFakeLeads, type FakeConvInput } from "./fake-detection";

function conv(o: Partial<FakeConvInput> & { id: string }): FakeConvInput {
  return {
    name: "Khách",
    nameResolved: true,
    customerMsgCount: 3,
    pageReplied: true,
    repliedAfterPage: true,
    customerChars: 40,
    customerText: `tin that ${o.id}`,
    hasPhone: true,
    firstMsgMs: 1_000_000 + Math.random() * 1e9,
    ...o,
  };
}

describe("analyzeFakeLeads", () => {
  it("nick ảo nhắn 1 câu, không tên, không SĐT -> risk cao", () => {
    const r = analyzeFakeLeads([
      conv({ id: "1", nameResolved: false, customerMsgCount: 1, repliedAfterPage: false, customerChars: 3, hasPhone: false, customerText: "hi" }),
    ]);
    expect(r.conversations[0].risk).toBeGreaterThanOrEqual(90);
  });

  it("nhiều nick nhắn trùng câu -> band injected + dup cluster", () => {
    const convs: FakeConvInput[] = [];
    for (let i = 0; i < 20; i++)
      convs.push(conv({ id: `f${i}`, nameResolved: false, customerMsgCount: 1, repliedAfterPage: false, customerChars: 5, hasPhone: false, customerText: "cho hoi gia", firstMsgMs: 1_000_000 + i * 1000 }));
    const r = analyzeFakeLeads(convs);
    expect(r.band).toBe("injected");
    expect(r.dupClusters[0].text).toBe("cho hoi gia");
    expect(r.dupClusters[0].count).toBe(20);
    expect(r.burst.maxInWindow).toBe(20); // dồn trong 20 giây
    expect(r.evidence.length).toBeGreaterThan(0);
  });

  it("inbox thật (đối thoại, có tên & SĐT) -> band clean", () => {
    const convs: FakeConvInput[] = [];
    for (let i = 0; i < 15; i++)
      convs.push(conv({ id: `r${i}`, customerText: `chi muon dat ban toi nay ${i}`, firstMsgMs: 1_000_000 + i * 3600_000 }));
    const r = analyzeFakeLeads(convs);
    expect(r.band).toBe("clean");
    expect(r.suspectRate).toBeLessThan(20);
  });

  it("chưa có hội thoại -> báo cần dữ liệu", () => {
    const r = analyzeFakeLeads([]);
    expect(r.findings.some((f) => f.title.includes("Chưa có hội thoại"))).toBe(true);
  });
});
