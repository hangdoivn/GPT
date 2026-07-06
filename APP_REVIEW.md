# Hồ sơ nộp Facebook App Review — Hàng Đôi Social

Tài liệu này gom sẵn nội dung để dán vào phần **App Review** của Meta. Copy từng mục
vào ô tương ứng khi submit.

> **Bối cảnh (nói rõ với reviewer):** đây là công cụ **nội bộ**, chỉ dùng cho các Trang
> Facebook do chính Hàng Đôi Studio sở hữu/quản lý (Hang Đôi Production, Academy, Shot For
> Biz, ZenG studio). Không phục vụ người dùng bên thứ ba.

---

## 0. Trước khi submit — checklist (bạn làm)

- [ ] **Business Verification**: Meta → Business Settings → Security Center → xác minh doanh
      nghiệp (upload giấy phép KD/giấy tờ). Bắt buộc cho các quyền page/ads.
- [ ] **Settings → Basic**: điền
  - Privacy Policy URL: `https://social.hangdoistudio.vn/privacy`
  - User Data Deletion: `https://social.hangdoistudio.vn/data-deletion`
  - Category, App Icon 1024×1024 (đã có).
- [ ] **Thêm reviewer làm Test User** hoặc để app ở chế độ có thể đăng nhập bằng tài khoản
      admin khi quay screencast.
- [ ] Chuẩn bị **screencast** theo kịch bản mục 3.

---

## 1. Mô tả ứng dụng (App description)

> Hàng Đôi Social là công cụ nội bộ giúp Hàng Đôi Studio quản lý các fanpage của chính mình:
> phân tích hiệu quả bài đăng và quảng cáo, tự động chấm điểm & lọc khách hàng tiềm năng kém
> chất lượng (số điện thoại ảo, thông tin giả) từ Lead Ads và tin nhắn Messenger, và quản lý
> chăm sóc khách hàng (CRM). Toàn bộ dữ liệu chỉ dùng nội bộ, không chia sẻ bên thứ ba.

---

## 2. Lý do & cách dùng từng quyền (dán vào ô "How will you use this permission?")

**pages_show_list** — Liệt kê các Trang người dùng quản lý để họ chọn Trang cần phân tích trong
mục Cài đặt.

**pages_read_engagement** — Đọc bài đăng của chính Trang cùng lượt cảm xúc/bình luận/chia sẻ để
hiển thị "Hiệu quả bài đăng" (tương tác trung bình, nhịp đăng, bài tốt nhất) ở trang Insights.

**read_insights** — Đọc chỉ số Trang (tiếp cận, tương tác, theo dõi) để vẽ biểu đồ xu hướng và
đưa nhận định sức khoẻ fanpage.

**leads_retrieval** — Kéo khách hàng tiềm năng từ Lead Ads của chính Trang về để chấm điểm chất
lượng và quản lý chăm sóc.

**pages_messaging** — Đọc hội thoại Messenger của Trang để nhận diện khách hàng tiềm năng (tên +
số điện thoại khách để lại trong tin nhắn) và chấm điểm lọc rác. Không gửi tin nhắn tự động cho
người dùng.

**ads_read** — Đọc số liệu chiến dịch quảng cáo (chi phí, tiếp cận, kết quả) của ad account để
tính chi phí trên mỗi khách hàng thật và tỉ lệ khách rác theo từng chiến dịch.

**pages_manage_ads** — Cần để đọc dữ liệu lead/quảng cáo gắn với Trang (Facebook yêu cầu quyền này
cho các endpoint liên quan lead ads của Trang).

**pages_manage_metadata** — Đăng ký webhook `leadgen` để nhận khách hàng tiềm năng mới theo thời
gian thực. Không thay đổi cài đặt Trang ngoài mục đích này.

**business_management** — Truy cập ad account nằm trong Business Portfolio của chúng tôi để đọc số
liệu quảng cáo.

---

## 3. Kịch bản screencast cho reviewer (quay màn hình theo đúng thứ tự)

1. Mở `https://social.hangdoistudio.vn` → mục **Cài đặt** → bấm **Đăng nhập với Facebook** →
   cấp quyền → chọn một Trang (vd Hang Đôi Production). *(minh hoạ pages_show_list)*
2. Mở **Insights Page**: hiện bài đăng thật + tương tác từng bài + nhận định.
   *(pages_read_engagement, read_insights)*
3. Về **Tổng quan** → bấm **Đồng bộ Facebook**: kéo chiến dịch quảng cáo + khách hàng tiềm năng
   (Lead Ads + Messenger). *(ads_read, pages_manage_ads, leads_retrieval, pages_messaging)*
4. Mở **Lead & Lọc rác**: cho thấy khách được chấm điểm và lọc rác tự động.
5. Mở **Chiến dịch Ads** / **Đánh giá tệp**: cho thấy tỉ lệ rác theo chiến dịch + phán quyết.
6. Mở **Cài đặt → Ngắt kết nối** để minh hoạ luồng xoá/thu hồi quyền.

---

## 4. Ghi chú
- Nếu reviewer cần tài khoản test: thêm họ vào **App Roles → Testers**, hoặc cấp quyền vào một
  Trang demo.
- Business Verification thường mất 2–5 ngày; App Review từng quyền vài ngày–2 tuần.
- Trong lúc chờ duyệt, app vẫn dùng được với dữ liệu ads thật + import CSV.
