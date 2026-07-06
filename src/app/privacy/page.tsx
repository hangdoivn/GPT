export const metadata = {
  title: "Chính sách quyền riêng tư — Hàng Đôi Social",
};

// Trang công khai cho App Review Facebook (Privacy Policy URL).
export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-4 prose-sm">
      <h1 className="text-2xl font-bold">Chính sách quyền riêng tư</h1>
      <p className="text-sm text-gray-500 mt-1">Ứng dụng: Hàng Đôi Social — cập nhật 2026</p>

      <div className="space-y-5 mt-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="font-semibold text-base text-gray-900">1. Chúng tôi là ai</h2>
          <p>
            Hàng Đôi Social là công cụ nội bộ của Hàng Đôi Studio dùng để quản lý các fanpage do
            chính chúng tôi sở hữu/quản lý: phân tích hiệu quả nội dung & quảng cáo, quản lý và chấm
            điểm chất lượng khách hàng tiềm năng (lead). Liên hệ:{" "}
            <a className="text-brand" href="mailto:hangdoistudio@gmail.com">hangdoistudio@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-gray-900">2. Dữ liệu chúng tôi truy cập</h2>
          <p>Qua Facebook Graph API, chỉ với các Trang mà tài khoản kết nối có quyền quản lý:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Thông tin Trang: tên, danh mục, số người theo dõi (<code>pages_show_list</code>, <code>pages_read_engagement</code>).</li>
            <li>Bài đăng & tương tác của Trang: nội dung, lượt cảm xúc/bình luận/chia sẻ (<code>pages_read_engagement</code>).</li>
            <li>Chỉ số Trang: tiếp cận, tương tác, theo dõi (<code>read_insights</code>).</li>
            <li>Khách hàng tiềm năng từ Lead Ads và hội thoại Messenger: tên, số điện thoại, nội dung nhắn (<code>leads_retrieval</code>, <code>pages_messaging</code>).</li>
            <li>Số liệu quảng cáo: chiến dịch, chi phí, kết quả (<code>ads_read</code>, <code>pages_manage_ads</code>, <code>business_management</code>).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base text-gray-900">3. Mục đích sử dụng</h2>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Phân tích hiệu quả bài đăng và quảng cáo của chính Trang.</li>
            <li>Tự động chấm điểm & lọc khách hàng tiềm năng kém chất lượng (số điện thoại ảo, thông tin giả).</li>
            <li>Quản lý chăm sóc khách hàng (CRM) và lịch nội dung.</li>
          </ul>
          <p className="mt-1">Chúng tôi <b>không</b> bán, cho thuê hay chia sẻ dữ liệu này cho bên thứ ba.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-gray-900">4. Lưu trữ & bảo mật</h2>
          <p>
            Dữ liệu được lưu trong cơ sở dữ liệu riêng trên máy chủ do chúng tôi kiểm soát, truy cập
            hạn chế qua tài khoản quản trị. Token kết nối được dùng nội bộ để gọi API và không chia sẻ
            ra ngoài. Chúng tôi chỉ giữ dữ liệu trong thời gian cần thiết cho mục đích trên.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-gray-900">5. Xoá dữ liệu</h2>
          <p>
            Bạn có thể ngắt kết nối bất cứ lúc nào trong mục Cài đặt (nút “Ngắt kết nối”), hoặc yêu cầu
            xoá toàn bộ dữ liệu theo hướng dẫn tại{" "}
            <a className="text-brand" href="/data-deletion">trang Xoá dữ liệu</a>, hoặc email{" "}
            <a className="text-brand" href="mailto:hangdoistudio@gmail.com">hangdoistudio@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-gray-900">6. Thay đổi</h2>
          <p>Chính sách có thể được cập nhật; phiên bản mới nhất luôn hiển thị tại trang này.</p>
        </section>
      </div>
    </div>
  );
}
