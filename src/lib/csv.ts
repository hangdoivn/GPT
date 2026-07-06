// Parser CSV tối giản, không phụ thuộc thư viện ngoài.
// Hỗ trợ trường có dấu phẩy trong ngoặc kép và xuống dòng chuẩn.

export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitRows(text.trim());
  if (rows.length < 2) return [];

  const headers = splitLine(rows[0]).map((h) => h.trim().toLowerCase());
  const out: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    const cells = splitLine(rows[i]);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = (cells[idx] ?? "").trim();
    });
    out.push(rec);
  }
  return out;
}

function splitRows(text: string): string[] {
  const rows: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === "\n" && !inQuotes) {
      rows.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) rows.push(cur);
  return rows.map((r) => r.replace(/\r$/, ""));
}

function splitLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

// Ánh xạ tên cột CSV (từ Facebook Ads/Forms export, tiếng Việt & Anh) sang field app.
const COLUMN_ALIASES: Record<string, string> = {
  "full_name": "fullName",
  "họ và tên": "fullName",
  "họ tên": "fullName",
  "tên": "fullName",
  "name": "fullName",
  "phone_number": "phone",
  "phone": "phone",
  "số điện thoại": "phone",
  "số đt": "phone",
  "sđt": "phone",
  "sdt": "phone",
  "email": "email",
  "city": "province",
  "tỉnh/thành phố": "province",
  "tỉnh thành": "province",
  "tỉnh": "province",
  "khu vực": "province",
  "province": "province",
  "message": "message",
  "ghi chú": "message",
  "nội dung": "message",
  "nội dung tin nhắn": "message",
};

// Cột chỉ nguồn chiến dịch — xếp theo độ ưu tiên (campaign > adset > form/ad).
// Cần để chẩn đoán "campaign nào ra rác" trong Đánh giá tệp.
const CAMPAIGN_COLUMNS: string[] = [
  "campaign_name",
  "campaign",
  "chiến dịch",
  "tên chiến dịch",
  "chiến dịch quảng cáo",
  "adset_name",
  "ad_set_name",
  "nhóm quảng cáo",
  "tên nhóm quảng cáo",
  "form_name",
  "tên biểu mẫu",
  "biểu mẫu",
  "ad_name",
  "tên quảng cáo",
  "quảng cáo",
];

export interface CsvLead {
  fullName: string;
  phone?: string;
  email?: string;
  province?: string;
  message?: string;
  campaign?: string; // tên chiến dịch/nhóm QC lấy từ file (để chẩn đoán rác theo campaign)
}

export function mapCsvLeads(records: Record<string, string>[]): CsvLead[] {
  return records.map((rec) => {
    const lead: CsvLead = { fullName: "" };
    // chuẩn hoá key về lowercase để tra cứu.
    const lower: Record<string, string> = {};
    for (const [col, val] of Object.entries(rec)) lower[col.trim().toLowerCase()] = val;

    for (const [col, val] of Object.entries(lower)) {
      const field = COLUMN_ALIASES[col];
      if (field) (lead as unknown as Record<string, string>)[field] = val;
    }

    // Chiến dịch: lấy cột ưu tiên cao nhất có giá trị.
    for (const c of CAMPAIGN_COLUMNS) {
      const v = lower[c]?.trim();
      if (v) {
        lead.campaign = v;
        break;
      }
    }
    return lead;
  });
}
