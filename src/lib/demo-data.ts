// Dữ liệu mẫu mô phỏng đúng tình huống "ads ra tệp rác":
// vài campaign chất lượng tốt, và campaign "giá rẻ" ra toàn số ảo.

export interface DemoCampaign {
  fbCampaignId: string;
  name: string;
  objective: string;
  status: string;
  dailyBudget: number;
  spend: number;
  impressions: number;
  clicks: number;
}

export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    fbCampaignId: "demo_c1",
    name: "Áo Đôi Tết - Lookalike 3%",
    objective: "LEAD_GENERATION",
    status: "ACTIVE",
    dailyBudget: 300000,
    spend: 4200000,
    impressions: 185000,
    clicks: 3100,
  },
  {
    fbCampaignId: "demo_c2",
    name: "Combo Sale - Broad giá rẻ",
    objective: "LEAD_GENERATION",
    status: "ACTIVE",
    dailyBudget: 500000,
    spend: 6800000,
    impressions: 520000,
    clicks: 9800,
  },
  {
    fbCampaignId: "demo_c3",
    name: "Retarget khách cũ",
    objective: "MESSAGES",
    status: "PAUSED",
    dailyBudget: 150000,
    spend: 1800000,
    impressions: 62000,
    clicks: 1400,
  },
];

export interface DemoLead {
  campaign: string; // fbCampaignId
  fullName: string;
  phone?: string;
  email?: string;
  province?: string;
  message?: string;
}

// c1: tệp tốt. c2: nhiều rác (số ảo, tên test). c3: khá tốt.
export const DEMO_LEADS: DemoLead[] = [
  // Campaign 1 — chất lượng
  { campaign: "demo_c1", fullName: "Nguyễn Thị Hằng", phone: "0912883471", province: "Hà Nội", message: "Chị đặt combo áo đôi size L/M" },
  { campaign: "demo_c1", fullName: "Trần Minh Quân", phone: "0978221340", province: "TP.HCM", message: "Còn màu be không shop" },
  { campaign: "demo_c1", fullName: "Lê Thu Trang", phone: "0356712889", province: "Đà Nẵng" },
  { campaign: "demo_c1", fullName: "Phạm Văn Đức", phone: "0834552017", province: "Hải Phòng", message: "Giao COD nhé" },
  { campaign: "demo_c1", fullName: "Vũ Ngọc Anh", phone: "0902114577", province: "Hà Nội" },

  // Campaign 2 — tệp rác
  { campaign: "demo_c2", fullName: "test", phone: "0911111111" },
  { campaign: "demo_c2", fullName: "aaa", phone: "0123456789" },
  { campaign: "demo_c2", fullName: "Nguyễn Văn A", phone: "0000000000" },
  { campaign: "demo_c2", fullName: "abc xyz", phone: "099", message: "hỏi cho biết" },
  { campaign: "demo_c2", fullName: "k", phone: "0912345678" },
  { campaign: "demo_c2", fullName: "Hàng Đôi", phone: "0987654321", message: "không mua" },
  { campaign: "demo_c2", fullName: "Trần Thị Mai", phone: "0388119922", province: "Nghệ An", message: "Cho xem thêm mẫu" },
  { campaign: "demo_c2", fullName: "haha", phone: "0900000000" },
  { campaign: "demo_c2", fullName: "spam", email: "test@fake.com" },
  { campaign: "demo_c2", fullName: "Lý Văn Bình", phone: "0765443210", province: "Cần Thơ" },

  // Campaign 3 — retarget, khá tốt
  { campaign: "demo_c3", fullName: "Đỗ Thu Hà", phone: "0917882330", province: "Hà Nội", message: "Mua lại lần 2" },
  { campaign: "demo_c3", fullName: "Bùi Quốc Toản", phone: "0398112774", province: "Bắc Ninh" },
  { campaign: "demo_c3", fullName: "Ngô Thị Lan", phone: "0847229100", province: "Hưng Yên", message: "Ship giúp em 2 bộ" },
  { campaign: "demo_c3", fullName: "xxx", phone: "0911111111" },
];
