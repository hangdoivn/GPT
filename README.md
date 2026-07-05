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

Cần một PostgreSQL (chạy nhanh bằng Docker: `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres`).

```bash
npm install
cp .env.example .env      # điền DATABASE_URL + App ID/Secret
npm run db:push           # tạo bảng
npm run db:seed           # (tuỳ chọn) nạp dữ liệu demo
npm run dev               # http://localhost:3000
```

Chưa có token Facebook vẫn dùng được: bấm **Nạp dữ liệu demo** hoặc **Import CSV** (export từ Facebook Ads/Forms) trên giao diện.

## Deploy lên Vercel (khuyên dùng)

App đã cấu hình sẵn để deploy serverless: build chạy `prisma migrate deploy` tự tạo bảng, và cron trong `vercel.json` gọi `/api/cron/sync` để đồng bộ định kỳ.

1. **Import repo** vào Vercel (New Project → chọn repo GitHub này).
2. **Thêm database**: tab Storage → tạo Postgres (Neon) → Vercel tự thêm biến `DATABASE_URL`.
3. **Đặt Environment Variables**:
   - `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
   - `APP_URL` = URL Vercel của bạn (vd `https://hangdoi.vercel.app`)
   - `CRON_SECRET` = chuỗi ngẫu nhiên (bảo vệ endpoint cron)
4. **Deploy**. Sau khi có URL, vào Facebook App → *Facebook Login → Valid OAuth Redirect URIs* dán:
   `https://<domain-vercel>/api/auth/facebook/callback`
5. Mở app → **Cài đặt → Đăng nhập với Facebook**.

> Cron trên gói Vercel Hobby chạy 1 lần/ngày. Muốn đồng bộ dày hơn: dùng gói Pro, hoặc deploy lên host chạy tiến trình liên tục (Railway/Render) để dùng scheduler tích hợp sẵn trong app.

## Deploy lên VPS bằng Docker (scheduler chạy nền, đồng bộ dày tuỳ ý)

Cần: VPS có Docker + tên miền (vd `app.hangdoistudio.vn`) đã trỏ A record về IP VPS.

**Nếu cổng 80/443 đang trống** — dùng bản kèm Caddy (tự cấp HTTPS):
```bash
git clone https://github.com/hangdoivn/GPT.git && cd GPT
cp .env.deploy.example .env    # sửa DOMAIN + DB_PASSWORD
docker compose up -d --build
```

**Nếu VPS đã có nginx/aaPanel** lo 80/443 — xem [`PROXY.md`](./PROXY.md):
```bash
docker compose -f docker-compose.proxy.yml up -d --build
```

Sau khi có HTTPS, khai báo trong Facebook App → *Valid OAuth Redirect URIs*:
`https://<domain>/api/auth/facebook/callback`, rồi mở app → **Cài đặt → Đăng nhập với Facebook**.

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
