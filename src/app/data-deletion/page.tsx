export const metadata = {
  title: "Xoá dữ liệu người dùng — Hàng Đôi Social",
};

// Trang công khai cho App Review Facebook (User Data Deletion URL).
export default function DataDeletionPage() {
  return (
    <div className="max-w-3xl mx-auto py-4">
      <h1 className="text-2xl font-bold">Hướng dẫn xoá dữ liệu</h1>
      <div className="space-y-4 mt-6 text-sm leading-relaxed text-gray-700">
        <p>
          Hàng Đôi Social lưu dữ liệu lấy từ Facebook (thông tin Trang, bài đăng & tương tác, khách
          hàng tiềm năng, số liệu quảng cáo) để phục vụ phân tích & quản lý nội bộ. Bạn có thể xoá dữ
          liệu bằng một trong các cách sau:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <b>Ngắt kết nối trong ứng dụng:</b> vào <b>Cài đặt → Ngắt kết nối</b>. Thao tác này xoá token
            kết nối và ngừng mọi truy cập tới Facebook.
          </li>
          <li>
            <b>Gỡ ứng dụng khỏi Facebook:</b> vào Facebook → <i>Cài đặt & quyền riêng tư → Cài đặt → Ứng
            dụng và trang web</i> → gỡ “Hàng Đôi Social”.
          </li>
          <li>
            <b>Yêu cầu xoá toàn bộ:</b> gửi email tới{" "}
            <a className="text-brand" href="mailto:hangdoistudio@gmail.com">hangdoistudio@gmail.com</a>{" "}
            với tiêu đề “Yêu cầu xoá dữ liệu” kèm tên Trang. Chúng tôi sẽ xoá toàn bộ dữ liệu liên quan
            trong vòng 7 ngày làm việc và xác nhận lại qua email.
          </li>
        </ol>
        <p className="text-gray-500">
          Sau khi xoá, mọi lead, số liệu và token liên quan tới tài khoản/Trang của bạn sẽ bị gỡ khỏi
          cơ sở dữ liệu của chúng tôi.
        </p>
      </div>
    </div>
  );
}
