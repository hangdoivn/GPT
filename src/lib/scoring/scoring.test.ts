import { describe, it, expect } from "vitest";
import { scoreLead, classify } from "./index";
import { checkPhone } from "./phone";

describe("checkPhone", () => {
  it("chấp nhận số hợp lệ", () => {
    expect(checkPhone("0987 654 3 21").valid).toBe(false); // dãy giảm liên tục -> ảo
    expect(checkPhone("0912 883 471").valid).toBe(true);
    expect(checkPhone("+84 90 123 8842").normalized).toBe("0901238842");
  });

  it("bắt số sai định dạng", () => {
    expect(checkPhone("").valid).toBe(false);
    expect(checkPhone("123").valid).toBe(false);
    expect(checkPhone("0123456789").valid).toBe(false); // đầu 012 không tồn tại
    expect(checkPhone("0000000000").valid).toBe(false);
  });

  it("bắt dãy số lặp/liên tục", () => {
    expect(checkPhone("0911111111").valid).toBe(false);
    expect(checkPhone("0912345678").valid).toBe(false);
  });

  it("chuẩn hoá +84 và 84", () => {
    expect(checkPhone("84901238842").normalized).toBe("0901238842");
  });
});

describe("scoreLead", () => {
  it("lead tốt được điểm cao", () => {
    const r = scoreLead({
      fullName: "Nguyễn Thị Hằng",
      phone: "0912 883 471",
      province: "Hà Nội",
      message: "Chị muốn đặt combo 2 áo",
    });
    expect(r.quality).toBe("good");
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.reasons.length).toBe(0);
  });

  it("số điện thoại ảo bị đánh rác", () => {
    const r = scoreLead({ fullName: "Nguyễn Văn A", phone: "0911111111" });
    expect(r.quality).toBe("junk");
    expect(r.reasons.some((x) => x.includes("SĐT"))).toBe(true);
  });

  it("thiếu SĐT + tên giả -> rác", () => {
    const r = scoreLead({ fullName: "aaa", phone: null });
    expect(r.quality).toBe("junk");
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("từ khoá spam bị trừ điểm", () => {
    const r = scoreLead({ fullName: "test", phone: "0912883471" });
    expect(r.reasons.some((x) => x.includes("spam") || x.includes("giả"))).toBe(true);
  });

  it("classify đúng ngưỡng", () => {
    expect(classify(85)).toBe("good");
    expect(classify(55)).toBe("warm");
    expect(classify(20)).toBe("junk");
  });
});
