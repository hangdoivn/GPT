// Hàm format dùng chung cho cả server & client component.
// KHÔNG đặt trong file "use client" để server component gọi được.

export function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";
}
