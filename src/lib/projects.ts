// PRJ — logic thuần cho module quản lý dự án (KHÔNG phụ thuộc DB → dễ test).
// Các hàm nhận `now` từ ngoài để test ổn định, không gọi Date.now() bên trong.

// ─── Giai đoạn Kanban của một dự án ────────────────────────────
export interface StageDef {
  key: string;
  label: string;
  color: string; // border-top cho cột Kanban
  done: boolean; // giai đoạn kết thúc (không tính quá hạn)
}

export const STAGES: StageDef[] = [
  { key: "brief", label: "Tiếp nhận", color: "border-t-blue-400", done: false },
  { key: "doing", label: "Đang triển khai", color: "border-t-indigo-400", done: false },
  { key: "review", label: "Nghiệm thu nội bộ", color: "border-t-purple-400", done: false },
  { key: "handover", label: "Bàn giao khách", color: "border-t-amber-400", done: false },
  { key: "done", label: "Hoàn tất", color: "border-t-green-500", done: true },
  { key: "cancelled", label: "Huỷ", color: "border-t-gray-400", done: true },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);
// Thứ tự tiến (không gồm "cancelled") để nút ◀ ▶ đi qua.
export const STAGE_FLOW = ["brief", "doing", "review", "handover", "done"];

export const PRIORITIES = ["low", "normal", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export function stageLabel(key: string): string {
  return STAGES.find((s) => s.key === key)?.label ?? key;
}

export function isDoneStage(key: string): boolean {
  return STAGES.find((s) => s.key === key)?.done ?? false;
}

// ─── Tiến độ đầu việc ──────────────────────────────────────────
export interface TaskLike {
  status: string; // todo | doing | done
}

// % đầu việc đã xong (0–100). Không có việc → 0.
export function taskProgress(tasks: TaskLike[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

export function taskCounts(tasks: TaskLike[]): { total: number; done: number; doing: number; todo: number } {
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    todo: tasks.filter((t) => t.status === "todo").length,
  };
}

// ─── Thanh toán ────────────────────────────────────────────────
export interface MilestoneLike {
  amount: number;
  paid: boolean;
}

export interface PaymentSummary {
  contractValue: number;
  planned: number; // tổng tiền đã lên mốc
  paid: number; // tổng đã thu (mốc đã thanh toán)
  remaining: number; // còn phải thu so với giá trị hợp đồng
  paidPct: number; // % đã thu trên giá trị hợp đồng
  unplanned: number; // phần giá trị HĐ chưa gắn mốc nào (≥0)
}

export function paymentSummary(contractValue: number, milestones: MilestoneLike[]): PaymentSummary {
  const cv = Math.max(0, Math.round(contractValue || 0));
  const planned = milestones.reduce((s, m) => s + Math.max(0, Math.round(m.amount || 0)), 0);
  const paid = milestones
    .filter((m) => m.paid)
    .reduce((s, m) => s + Math.max(0, Math.round(m.amount || 0)), 0);
  const remaining = Math.max(0, cv - paid);
  // Chỉ hiện 100% khi ĐÃ thu đủ. Nếu còn thiếu chút ít (vd 99.7%) mà làm tròn lên
  // 100 thì hiểu nhầm là đã tất toán trong khi remaining vẫn > 0 → kẹp ở 99.
  const paidPct = cv > 0 ? (paid >= cv ? 100 : Math.min(99, Math.round((paid / cv) * 100))) : 0;
  const unplanned = Math.max(0, cv - planned);
  return { contractValue: cv, planned, paid, remaining, paidPct, unplanned };
}

// ─── Thời hạn ──────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;
// App phục vụ VN (UTC+7, không có DST). "Hôm nay" phải tính theo lịch VN, không
// theo UTC — nếu không, buổi sáng sớm giờ VN (còn là hôm qua theo UTC) sẽ đếm sai
// số ngày còn lại / đánh dấu quá hạn trễ mất một ngày.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// Số ngày còn lại tới deadline (âm = đã trễ). null nếu không đặt hạn.
export function daysLeft(deadline: Date | string | null | undefined, now: Date): number | null {
  if (!deadline) return null;
  const d = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  // deadline nhập dạng ngày → lưu ở mốc 00:00Z, ngày UTC của nó CHÍNH là ngày dự
  // định. "Hôm nay" thì quy về ngày lịch VN (dời +7h rồi lấy ngày UTC).
  const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const nowVn = new Date(now.getTime() + VN_OFFSET_MS);
  const b = Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate());
  return Math.round((a - b) / DAY_MS);
}

// Quá hạn: có deadline đã qua VÀ dự án chưa kết thúc (done/cancelled).
export function isOverdue(
  deadline: Date | string | null | undefined,
  stage: string,
  now: Date
): boolean {
  if (isDoneStage(stage)) return false;
  const left = daysLeft(deadline, now);
  return left !== null && left < 0;
}

// ─── Tổng hợp danh sách dự án (cho dashboard PRJ) ───────────────
export interface ProjectLike {
  stage: string;
  deadline: Date | string | null;
  contractValue: number;
  milestones: MilestoneLike[];
}

export interface ProjectsSummary {
  total: number;
  active: number; // chưa done/cancelled
  done: number;
  overdue: number;
  byStage: Record<string, number>;
  contractTotal: number;
  paidTotal: number;
  remainingTotal: number; // chỉ tính dự án còn hoạt động
}

export function summarizeProjects(projects: ProjectLike[], now: Date): ProjectsSummary {
  const byStage: Record<string, number> = {};
  for (const k of STAGE_KEYS) byStage[k] = 0;

  let active = 0;
  let done = 0;
  let overdue = 0;
  let contractTotal = 0;
  let paidTotal = 0;
  let remainingTotal = 0;

  for (const p of projects) {
    byStage[p.stage] = (byStage[p.stage] ?? 0) + 1;
    const finished = isDoneStage(p.stage);
    if (p.stage === "done") done++;
    if (!finished) active++;
    if (isOverdue(p.deadline, p.stage, now)) overdue++;

    const pay = paymentSummary(p.contractValue, p.milestones);
    // Dự án huỷ không tính vào doanh thu.
    if (p.stage !== "cancelled") {
      contractTotal += pay.contractValue;
      paidTotal += pay.paid;
      if (!finished) remainingTotal += pay.remaining;
    }
  }

  return {
    total: projects.length,
    active,
    done,
    overdue,
    byStage,
    contractTotal,
    paidTotal,
    remainingTotal,
  };
}

// ─── Sinh mã dự án PRJ-000N từ số thứ tự ───────────────────────
export function formatProjectCode(seq: number): string {
  return `PRJ-${String(Math.max(1, Math.floor(seq))).padStart(4, "0")}`;
}
