"use client";

import { useEffect, useState, useCallback } from "react";

interface Post {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  likes: number;
  comments: number;
  createdAt: string;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "Nháp", cls: "bg-gray-100 text-gray-600" },
  scheduled: { label: "Đã lên lịch", cls: "bg-amber-100 text-amber-700" },
  published: { label: "Đã đăng", cls: "bg-green-100 text-green-700" },
};

export default function ContentPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/posts");
    setPosts(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(publishNow: boolean) {
    if (!content.trim()) return;
    setBusy(true);
    setMsg(null);
    const body: Record<string, unknown> = { content, publishNow };
    if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setContent("");
      setScheduledAt("");
      setMsg("Đã lưu bài.");
      load();
    } else {
      setMsg(data.error?.fieldErrors ? "Kiểm tra lại nội dung" : data.error ?? "Lỗi");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Nội dung fanpage</h1>
        <p className="text-sm text-gray-500">Soạn, lưu nháp, lên lịch hoặc đăng bài lên page.</p>
      </div>

      <div className="card p-4 space-y-3">
        <textarea
          className="input min-h-[120px]"
          placeholder="Viết nội dung bài đăng…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="label">Lên lịch (tuỳ chọn)</label>
            <input
              type="datetime-local"
              className="input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 ml-auto">
            <button className="btn-ghost" disabled={busy} onClick={() => submit(false)}>Lưu nháp</button>
            <button className="btn-primary" disabled={busy} onClick={() => submit(true)}>
              {scheduledAt ? "Lên lịch đăng" : "Đăng ngay"}
            </button>
          </div>
        </div>
        {msg && <div className="text-sm text-gray-600">{msg}</div>}
        <p className="text-xs text-gray-400">
          Đăng thật lên Facebook cần cấu hình token ở trang Cài đặt. Chưa có token thì bài vẫn được
          lưu nháp trong app.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 font-semibold">Bài đã tạo</div>
        <div className="divide-y divide-gray-100">
          {posts.length === 0 && <div className="px-5 py-4 text-sm text-gray-400">Chưa có bài nào.</div>}
          {posts.map((p) => {
            const s = STATUS_LABEL[p.status] ?? STATUS_LABEL.draft;
            return (
              <div key={p.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm whitespace-pre-wrap flex-1">{p.content}</p>
                  <span className={`badge ${s.cls} shrink-0`}>{s.label}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {p.scheduledAt && p.status === "scheduled" && `Lịch: ${new Date(p.scheduledAt).toLocaleString("vi-VN")}`}
                  {p.status === "published" && `👍 ${p.likes} · 💬 ${p.comments}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
