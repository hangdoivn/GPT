import { describe, it, expect } from "vitest";
import {
  taskProgress,
  taskCounts,
  paymentSummary,
  daysLeft,
  isOverdue,
  summarizeProjects,
  formatProjectCode,
  stageLabel,
  isDoneStage,
} from "./projects";

describe("taskProgress", () => {
  it("không có việc -> 0%", () => {
    expect(taskProgress([])).toBe(0);
  });
  it("một nửa xong -> 50%", () => {
    expect(taskProgress([{ status: "done" }, { status: "todo" }])).toBe(50);
  });
  it("chỉ tính status=done (doing chưa tính)", () => {
    expect(taskProgress([{ status: "done" }, { status: "doing" }, { status: "todo" }, { status: "todo" }])).toBe(25);
  });
  it("làm tròn", () => {
    expect(taskProgress([{ status: "done" }, { status: "todo" }, { status: "todo" }])).toBe(33);
  });
});

describe("taskCounts", () => {
  it("đếm theo trạng thái", () => {
    const c = taskCounts([{ status: "done" }, { status: "done" }, { status: "doing" }, { status: "todo" }]);
    expect(c).toEqual({ total: 4, done: 2, doing: 1, todo: 1 });
  });
});

describe("paymentSummary", () => {
  it("cộng mốc đã thanh toán", () => {
    const s = paymentSummary(10_000_000, [
      { amount: 3_000_000, paid: true },
      { amount: 4_000_000, paid: false },
      { amount: 3_000_000, paid: true },
    ]);
    expect(s.planned).toBe(10_000_000);
    expect(s.paid).toBe(6_000_000);
    expect(s.remaining).toBe(4_000_000);
    expect(s.paidPct).toBe(60);
    expect(s.unplanned).toBe(0);
  });

  it("chưa gắn đủ mốc -> unplanned = phần còn lại của HĐ", () => {
    const s = paymentSummary(10_000_000, [{ amount: 3_000_000, paid: true }]);
    expect(s.planned).toBe(3_000_000);
    expect(s.unplanned).toBe(7_000_000);
    expect(s.paid).toBe(3_000_000);
  });

  it("giá trị HĐ = 0 -> paidPct = 0, không chia cho 0", () => {
    const s = paymentSummary(0, [{ amount: 1_000_000, paid: true }]);
    expect(s.paidPct).toBe(0);
    expect(s.remaining).toBe(0);
  });

  it("thu vượt HĐ vẫn kẹp ở 100% và remaining không âm", () => {
    const s = paymentSummary(5_000_000, [{ amount: 8_000_000, paid: true }]);
    expect(s.paidPct).toBe(100);
    expect(s.remaining).toBe(0);
  });

  it("thu gần đủ (99.7%) KHÔNG làm tròn lên 100 khi vẫn còn nợ", () => {
    const s = paymentSummary(10_000_000, [
      { amount: 9_970_000, paid: true },
      { amount: 30_000, paid: false },
    ]);
    expect(s.paidPct).toBe(99);
    expect(s.remaining).toBe(30_000);
  });
});

describe("daysLeft", () => {
  const now = new Date("2026-07-16T10:00:00Z");
  it("không có hạn -> null", () => {
    expect(daysLeft(null, now)).toBeNull();
  });
  it("hạn 3 ngày tới", () => {
    expect(daysLeft("2026-07-19T00:00:00Z", now)).toBe(3);
  });
  it("đã trễ 2 ngày -> âm", () => {
    expect(daysLeft("2026-07-14T00:00:00Z", now)).toBe(-2);
  });
  it("ngày sai định dạng -> null", () => {
    expect(daysLeft("không-phải-ngày", now)).toBeNull();
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-07-16T10:00:00Z");
  it("deadline đã qua + đang triển khai -> quá hạn", () => {
    expect(isOverdue("2026-07-10T00:00:00Z", "doing", now)).toBe(true);
  });
  it("deadline đã qua nhưng đã hoàn tất -> KHÔNG quá hạn", () => {
    expect(isOverdue("2026-07-10T00:00:00Z", "done", now)).toBe(false);
  });
  it("dự án huỷ -> không tính quá hạn", () => {
    expect(isOverdue("2026-07-10T00:00:00Z", "cancelled", now)).toBe(false);
  });
  it("chưa tới hạn -> không quá hạn", () => {
    expect(isOverdue("2026-07-20T00:00:00Z", "doing", now)).toBe(false);
  });
});

// "Hôm nay" phải tính theo lịch VN (UTC+7), không theo UTC.
describe("daysLeft/isOverdue theo lịch VN (UTC+7)", () => {
  // 2026-07-21 03:00 giờ VN = 2026-07-20T20:00:00Z (vẫn là 20/07 theo UTC).
  const nowVnMorning = new Date("2026-07-20T20:00:00Z");

  it("sáng sớm giờ VN đúng ngày đáo hạn -> còn 0 ngày (không phải 1)", () => {
    expect(daysLeft("2026-07-21T00:00:00Z", nowVnMorning)).toBe(0);
  });
  it("sáng sớm giờ VN, hạn hôm qua (VN) -> đã trễ 1 ngày", () => {
    expect(daysLeft("2026-07-20T00:00:00Z", nowVnMorning)).toBe(-1);
  });
  it("hạn hôm qua (VN) + đang triển khai -> quá hạn ngay sáng sớm giờ VN", () => {
    expect(isOverdue("2026-07-20T00:00:00Z", "doing", nowVnMorning)).toBe(true);
  });
});

describe("summarizeProjects", () => {
  const now = new Date("2026-07-16T10:00:00Z");
  it("tổng hợp active/done/overdue + tài chính", () => {
    const s = summarizeProjects(
      [
        { stage: "doing", deadline: "2026-07-10T00:00:00Z", contractValue: 10_000_000, milestones: [{ amount: 5_000_000, paid: true }] }, // overdue, active
        { stage: "done", deadline: "2026-07-01T00:00:00Z", contractValue: 20_000_000, milestones: [{ amount: 20_000_000, paid: true }] }, // done, không overdue
        { stage: "cancelled", deadline: "2026-01-01T00:00:00Z", contractValue: 99_000_000, milestones: [] }, // huỷ, bỏ khỏi doanh thu
      ],
      now
    );
    expect(s.total).toBe(3);
    expect(s.active).toBe(1);
    expect(s.done).toBe(1);
    expect(s.overdue).toBe(1);
    expect(s.byStage.doing).toBe(1);
    expect(s.byStage.done).toBe(1);
    expect(s.byStage.cancelled).toBe(1);
    // Huỷ không tính vào tiền
    expect(s.contractTotal).toBe(30_000_000);
    expect(s.paidTotal).toBe(25_000_000);
    // remaining chỉ tính dự án còn hoạt động (dự án doing: 10tr - 5tr = 5tr)
    expect(s.remainingTotal).toBe(5_000_000);
  });

  it("danh sách rỗng -> số 0", () => {
    const s = summarizeProjects([], now);
    expect(s.total).toBe(0);
    expect(s.contractTotal).toBe(0);
  });
});

describe("formatProjectCode", () => {
  it("đệm 0 tới 4 chữ số", () => {
    expect(formatProjectCode(7)).toBe("PRJ-0007");
    expect(formatProjectCode(1234)).toBe("PRJ-1234");
  });
  it("số < 1 -> tối thiểu PRJ-0001", () => {
    expect(formatProjectCode(0)).toBe("PRJ-0001");
  });
});

describe("stage helpers", () => {
  it("nhãn giai đoạn", () => {
    expect(stageLabel("handover")).toBe("Bàn giao khách");
    expect(stageLabel("unknown")).toBe("unknown");
  });
  it("giai đoạn kết thúc", () => {
    expect(isDoneStage("done")).toBe(true);
    expect(isDoneStage("cancelled")).toBe(true);
    expect(isDoneStage("doing")).toBe(false);
  });
});
