"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Tổng quan", icon: "📊" },
  { href: "/leads", label: "Lead & Lọc rác", icon: "🎯" },
  { href: "/ads", label: "Chiến dịch Ads", icon: "📈" },
  { href: "/crm", label: "CRM chăm khách", icon: "🤝" },
  { href: "/content", label: "Nội dung", icon: "📝" },
  { href: "/settings", label: "Cài đặt", icon: "⚙️" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white min-h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="font-bold text-lg leading-tight">Hàng Đôi</div>
        <div className="text-xs text-gray-500">Fanpage Manager</div>
      </div>
      <nav className="p-3 space-y-1">
        {NAV.map((item) => {
          const active = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-brand text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
