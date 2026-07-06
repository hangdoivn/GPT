import { describe, it, expect } from "vitest";
import { parseCsv, mapCsvLeads } from "./csv";

describe("mapCsvLeads — bắt cột chiến dịch để chẩn đoán rác", () => {
  it("lấy tên chiến dịch từ cột campaign_name (Facebook export)", () => {
    const csv = `full_name,phone_number,campaign_name
Nguyễn An,0987654321,Broad FnB Giá Rẻ`;
    const [lead] = mapCsvLeads(parseCsv(csv));
    expect(lead.fullName).toBe("Nguyễn An");
    expect(lead.phone).toBe("0987654321");
    expect(lead.campaign).toBe("Broad FnB Giá Rẻ");
  });

  it("chấp nhận header tiếng Việt (chiến dịch, sđt, tỉnh)", () => {
    const csv = `Họ và tên,SĐT,Tỉnh,Chiến dịch
Trần Bình,0912000111,Hà Nội,Lookalike Khách Mua`;
    const [lead] = mapCsvLeads(parseCsv(csv));
    expect(lead.fullName).toBe("Trần Bình");
    expect(lead.province).toBe("Hà Nội");
    expect(lead.campaign).toBe("Lookalike Khách Mua");
  });

  it("ưu tiên campaign hơn adset/form khi có nhiều cột", () => {
    const csv = `name,campaign_name,adset_name,form_name
Lê Cường,Campaign A,Adset B,Form C`;
    const [lead] = mapCsvLeads(parseCsv(csv));
    expect(lead.campaign).toBe("Campaign A");
  });

  it("dùng nhóm quảng cáo khi không có cột chiến dịch", () => {
    const csv = `name,phone,nhóm quảng cáo
Phạm Dung,0356789012,Nhóm Sở Thích`;
    const [lead] = mapCsvLeads(parseCsv(csv));
    expect(lead.campaign).toBe("Nhóm Sở Thích");
  });

  it("để trống campaign khi file không có cột nào", () => {
    const csv = `name,phone
Vũ Em,0399111222`;
    const [lead] = mapCsvLeads(parseCsv(csv));
    expect(lead.campaign).toBeUndefined();
  });
});
