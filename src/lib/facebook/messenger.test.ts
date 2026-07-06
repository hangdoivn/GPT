import { describe, it, expect } from "vitest";
import { extractPhone } from "./messenger";

describe("extractPhone (tách SĐT từ tin nhắn Messenger)", () => {
  it("lấy số hợp lệ có khoảng trắng", () => {
    expect(extractPhone("Số của em là 0912 883 471 ạ")).toBe("0912883471");
  });
  it("lấy số có dấu chấm", () => {
    expect(extractPhone("gọi em 090.123.8842 nhé")).toBe("0901238842");
  });
  it("chuẩn hoá +84", () => {
    expect(extractPhone("sdt +84 90 123 8842")).toBe("0901238842");
  });
  it("không có số -> undefined", () => {
    expect(extractPhone("cho hỏi giá bao nhiêu")).toBeUndefined();
  });
  it("số ảo vẫn trả ứng viên thô để engine đánh rác", () => {
    expect(extractPhone("0000000000")).toBe("0000000000");
  });
});
