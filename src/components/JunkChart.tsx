"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function JunkChart({ data }: { data: { name: string; junkRate: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [`${v}%`, "Tỉ lệ rác"]} />
        <Bar dataKey="junkRate" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.junkRate > 40 ? "#ef4444" : d.junkRate > 20 ? "#f59e0b" : "#10b981"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
