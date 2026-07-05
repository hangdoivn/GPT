"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Point {
  date: string;
  reach: number;
  engagement: number;
  fanAdds: number;
}

const shortDate = (d: string) => d.slice(5); // MM-DD

export function ReachChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="reachFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1877F2" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#1877F2" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} minTickGap={20} />
        <YAxis tick={{ fontSize: 11 }} width={48} />
        <Tooltip
          formatter={(v: number) => [v.toLocaleString("vi-VN"), "Tiếp cận"]}
          labelFormatter={(l) => `Ngày ${l}`}
        />
        <Area type="monotone" dataKey="reach" stroke="#1877F2" strokeWidth={2} fill="url(#reachFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FollowChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} minTickGap={20} />
        <YAxis tick={{ fontSize: 11 }} width={48} />
        <Tooltip
          formatter={(v: number) => [v.toLocaleString("vi-VN"), "Follow mới"]}
          labelFormatter={(l) => `Ngày ${l}`}
        />
        <Bar dataKey="fanAdds" fill="#10b981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
