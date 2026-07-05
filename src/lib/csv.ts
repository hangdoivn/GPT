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
  "sđt": "phone",
  "email": "email",
  "city": "province",
  "tỉnh/thành phố": "province",
  "tỉnh thành": "province",
  "province": "province",
  "message": "message",
  "ghi chú": "message",
  "nội dung": "message",
};

export interface CsvLead {
  fullName: string;
  phone?: string;
  email?: string;
  province?: string;
  message?: string;
}

export function mapCsvLeads(records: Record<string, string>[]): CsvLead[] {
  return records.map((rec) => {
    const lead: CsvLead = { fullName: "" };
    for (const [col, val] of Object.entries(rec)) {
      const field = COLUMN_ALIASES[col.trim().toLowerCase()];
      if (field) (lead as unknown as Record<string, string>)[field] = val;
    }
    return lead;
  });
}
