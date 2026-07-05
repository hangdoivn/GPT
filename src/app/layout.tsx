import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Hàng Đôi — Fanpage Manager",
  description: "Quản lý fanpage, lọc lead rác và theo dõi hiệu quả ads",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-w-0 px-6 py-6 max-w-[1400px]">{children}</main>
        </div>
      </body>
    </html>
  );
}
