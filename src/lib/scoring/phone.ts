// Chuẩn hoá & kiểm tra số điện thoại Việt Nam.
// Dùng để phát hiện SĐT ảo/sai — nguồn "tệp rác" phổ biến nhất.

// Đầu số di động hợp lệ sau chuẩn hoá về dạng 0xxxxxxxxx (10 số).
// Nguồn: quy hoạch kho số MobiFone/Vina/Viettel/Vietnamobile/Gmobile.
const VALID_MOBILE_PREFIXES = [
  // Viettel
  "032", "033", "034", "035", "036", "037", "038", "039",
  "086", "096", "097", "098",
  // MobiFone
  "070", "079", "077", "076", "078", "089", "090", "093",
  // VinaPhone
  "081", "082", "083", "084", "085", "088", "091", "094",
  // Vietnamobile
  "052", "056", "058", "092",
  // Gmobile
  "059", "099",
];

export interface PhoneCheck {
  raw: string;
  normalized: string | null; // dạng 0xxxxxxxxx nếu hợp lệ
  valid: boolean;
  reason?: string;
}

/**
 * Chuẩn hoá số điện thoại về dạng nội địa 0xxxxxxxxx và kiểm tra tính hợp lệ.
 */
export function checkPhone(raw: string | null | undefined): PhoneCheck {
  const input = (raw ?? "").trim();
  if (!input) {
    return { raw: "", normalized: null, valid: false, reason: "Không có số điện thoại" };
  }

  // Bỏ mọi ký tự không phải số, giữ dấu + đầu tiên để nhận diện mã quốc tế.
  let digits = input.replace(/[^\d+]/g, "");

  // +84 / 84 -> 0
  if (digits.startsWith("+84")) digits = "0" + digits.slice(3);
  else if (digits.startsWith("84") && digits.length >= 11) digits = "0" + digits.slice(2);
  else digits = digits.replace(/\+/g, "");

  // Còn số 0 đầu là bắt buộc với số nội địa.
  if (!digits.startsWith("0")) {
    return { raw: input, normalized: null, valid: false, reason: "Sai định dạng (thiếu số 0 đầu / mã vùng)" };
  }

  if (digits.length !== 10) {
    return {
      raw: input,
      normalized: null,
      valid: false,
      reason: `Độ dài không hợp lệ (${digits.length} số, cần 10)`,
    };
  }

  const prefix = digits.slice(0, 3);
  if (!VALID_MOBILE_PREFIXES.includes(prefix)) {
    return { raw: input, normalized: digits, valid: false, reason: `Đầu số ${prefix} không thuộc nhà mạng nào` };
  }

  // Số lặp bất thường: 0900000000, 0911111111 -> gần như chắc chắn số ảo.
  const body = digits.slice(3);
  if (/^(\d)\1{6}$/.test(body)) {
    return { raw: input, normalized: digits, valid: false, reason: "Dãy số lặp lại bất thường (số ảo)" };
  }

  // Dãy tăng/giảm liên tục: 0912345678, 0987654321.
  if (isSequential(digits)) {
    return { raw: input, normalized: digits, valid: false, reason: "Dãy số liên tục bất thường (số ảo)" };
  }

  return { raw: input, normalized: digits, valid: true };
}

function isSequential(digits: string): boolean {
  const body = digits.slice(3); // 7 số cuối
  let asc = true;
  let desc = true;
  for (let i = 1; i < body.length; i++) {
    const diff = body.charCodeAt(i) - body.charCodeAt(i - 1);
    if (diff !== 1) asc = false;
    if (diff !== -1) desc = false;
  }
  return asc || desc;
}
