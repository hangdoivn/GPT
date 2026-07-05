# Hàng Đôi — Fanpage Manager

App quản lý fanpage cho **Hàng Đôi Studio**, giải quyết trực tiếp vấn đề *"ads ra tệp rác"*: tự động chấm điểm & lọc lead rác, chỉ ra chiến dịch nào đang mang về tệp xấu, kèm CRM chăm khách và quản lý nội dung.

## Tính năng

| Module | Mô tả |
| --- | --- |
| 🎯 **Lọc & chấm điểm lead** | Mỗi lead được chấm 0–100 điểm và phân loại **Chất lượng / Cần xác minh / Rác**, kèm lý do cụ thể (SĐT ảo, tên giả, spam…). |
| 📈 **Theo dõi Ads** | Bảng + biểu đồ **tỉ lệ rác theo từng chiến dịch** và **chi phí / lead thật** — biết ngay ads nào nên tắt. |
| 🤝 **CRM** | Kanban 5 bước: Mới → Đã liên hệ → Tiềm năng → Chốt đơn / Mất. |
| 📝 **Nội dung** | Soạn, lưu nháp, lên lịch và đăng bài lên page. |
| 🔌 **Facebook API** | Kéo lead từ Lead Ads, campaign từ Marketing API, webhook nhận lead realtime. |

## Engine lọc rác (`src/lib/scoring`)

Bắt đầu 100 điểm, trừ dần theo dấu hiệu xấu:

- **SĐT** (nặng nhất): sai định dạng, đầu số không thuộc nhà mạng, dãy lặp `0911111111`, dãy liên tục `0912345678`, thiếu SĐT.
- **Tên**: rỗng, quá ngắn, ngẫu nhiên (`aaa`, `abc`).
- **Spam**: từ khoá `test`, `không mua`, `hỏi cho biết`…
- **Email / tỉnh thành**: sai định dạng, email giả, thiếu địa chỉ.

Ngưỡng: `≥70` Chất lượng · `40–69` Cần xác minh · `<40` Rác. Chỉnh quy tắc tại `src/lib/scoring/index.ts` và đầu số nhà mạng tại `src/lib/scoring/phone.ts`.

## Chạy local

```bash
npm install
cp .env.example .env      # điền token Facebook nếu có
npm run db:push           # tạo SQLite database
npm run db:seed           # (tuỳ chọn) nạp dữ liệu demo
npm run dev               # http://localhost:3000
```

Chưa có token Facebook vẫn dùng được: bấm **Nạp dữ liệu demo** hoặc **Import CSV** (export từ Facebook Ads/Forms) trên giao diện.

## Kết nối Facebook

Điền vào `.env` (xem `.env.example`):

- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` — app tại developers.facebook.com
- `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID` — token dài hạn của page
- `FACEBOOK_AD_ACCOUNT_ID` — dạng `act_XXXX` cho Marketing API

Quyền cần xin: `leads_retrieval`, `ads_read`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_metadata`.

**Webhook realtime**: trỏ Facebook App → Webhooks → Page → `leadgen` tới `/api/webhook`, verify token = `FACEBOOK_WEBHOOK_VERIFY_TOKEN`.

## Lệnh

```bash
npm run dev        # dev server
npm run build      # build production
npm run test       # chạy test engine chấm điểm
npm run db:studio  # xem/sửa DB bằng Prisma Studio
```

## Kiến trúc

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Prisma + SQLite** (đổi sang PostgreSQL khi deploy — sửa `provider` trong `prisma/schema.prisma`)
- **Recharts** cho biểu đồ
- Logic chấm điểm thuần, không phụ thuộc DB → dễ test (`npm run test`)

```
src/
├── app/            # trang UI + API routes
├── components/     # UI dùng chung
└── lib/
    ├── scoring/    # ★ engine lọc rác (có test)
    ├── facebook/   # client Graph + Marketing API
    ├── analytics.ts# tổng hợp số liệu dashboard
    ├── sync.ts     # đồng bộ FB → DB
    └── csv.ts      # import CSV
```
