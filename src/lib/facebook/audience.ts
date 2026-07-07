// Nhân khẩu người xem — suy từ ADS breakdown (Marketing API).
// LƯU Ý: Facebook đã KHAI TỬ nhân khẩu follower organic (2024). Nguồn duy nhất
// còn lại để biết "ai đang xem" là breakdown của quảng cáo (người được ads tiếp cận).
// https://developers.facebook.com/docs/marketing-api/insights/breakdowns

import { graphAll, type FacebookConfig } from "./client";

export interface DemographicRow {
  label: string; // vd "25-34 · Nữ" hoặc "Hà Nội"
  reach: number;
  pct: number; // % trên tổng
}

export interface AudienceDemographics {
  available: boolean; // false nếu chưa chạy ads / thiếu quyền -> không có dữ liệu
  ageGender: DemographicRow[];
  region: DemographicRow[];
  totalReach: number;
  note?: string;
}

const GENDER_VI: Record<string, string> = { male: "Nam", female: "Nữ", unknown: "Không rõ" };

function toRows(
  raw: Array<Record<string, string | undefined>>,
  labelFn: (r: Record<string, string | undefined>) => string,
): { rows: DemographicRow[]; total: number } {
  const agg = new Map<string, number>();
  let total = 0;
  for (const r of raw) {
    const reach = parseInt(r.reach ?? r.impressions ?? "0", 10) || 0;
    if (reach <= 0) continue;
    const label = labelFn(r);
    agg.set(label, (agg.get(label) ?? 0) + reach);
    total += reach;
  }
  const rows = [...agg.entries()]
    .map(([label, reach]) => ({ label, reach, pct: total ? Math.round((reach / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.reach - a.reach);
  return { rows, total };
}

/**
 * Nhân khẩu người được quảng cáo tiếp cận (age/gender + region), 30 ngày gần nhất.
 * Chịu lỗi: chưa có ad account / chưa chạy ads -> available=false.
 */
export async function fetchAudienceDemographics(
  cfg: Pick<FacebookConfig, "adAccountId"> & { userToken: string },
): Promise<AudienceDemographics> {
  const empty: AudienceDemographics = { available: false, ageGender: [], region: [], totalReach: 0 };
  if (!cfg.adAccountId) {
    return { ...empty, note: "Chưa kết nối tài khoản quảng cáo — nhân khẩu người xem chỉ suy được từ dữ liệu ads." };
  }

  let ageGender: DemographicRow[] = [];
  let region: DemographicRow[] = [];
  let agTotal = 0;
  let regTotal = 0;

  try {
    // graphAll: duyệt hết các trang (breakdown nhiều dòng dễ vượt 1 trang -> tránh cắt cụt).
    const rows0 = await graphAll<Record<string, string | undefined>>(`${cfg.adAccountId}/insights`, {
      token: cfg.userToken,
      params: { fields: "reach", breakdowns: "age,gender", date_preset: "last_30d", level: "account", limit: 200 },
    });
    const { rows, total } = toRows(rows0, (r) => `${r.age ?? "?"} · ${GENDER_VI[r.gender ?? "unknown"] ?? r.gender ?? "?"}`);
    ageGender = rows;
    agTotal = total;
  } catch {
    /* không có dữ liệu ads theo tuổi/giới */
  }

  try {
    const rows0 = await graphAll<Record<string, string | undefined>>(`${cfg.adAccountId}/insights`, {
      token: cfg.userToken,
      params: { fields: "reach", breakdowns: "region", date_preset: "last_30d", level: "account", limit: 200 },
    });
    const { rows, total } = toRows(rows0, (r) => r.region ?? "Không rõ");
    region = rows.slice(0, 10); // top 10 vùng
    regTotal = total;
  } catch {
    /* không có dữ liệu ads theo vùng */
  }

  // Tổng tiếp cận ước lượng: ưu tiên tổng theo tuổi/giới, fallback theo vùng.
  const totalReach = agTotal || regTotal;
  const available = ageGender.length > 0 || region.length > 0;
  return {
    available,
    ageGender,
    region,
    totalReach,
    note: available
      ? "Nhân khẩu suy từ người được QUẢNG CÁO tiếp cận (Facebook đã gỡ nhân khẩu follower organic từ 2024)."
      : "Chưa có dữ liệu nhân khẩu — cần đang chạy ads trong 30 ngày để suy tệp người xem.",
  };
}
