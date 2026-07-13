"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AssetPicker, type PickedAsset } from "@/components/planner/AssetPicker";

interface Post {
  id: string;
  content: string;
  status: string;
  mediaType: string | null;
  mediaUrls: string[];
  thumbnail: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  fbPermalink: string | null;
  error: string | null;
  targetFbId: string | null;
  pageName: string | null;
}
interface Target {
  fbPageId: string;
  name: string;
  followers: number;
}
interface Compose {
  editingId?: string;
  caption: string;
  asset: PickedAsset | null;
  when: string; // datetime-local
  status?: string;
  fbPermalink?: string | null;
}

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  draft: { label: "Nháp", cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  scheduled: { label: "Đã lên lịch", cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  published: { label: "Đã đăng", cls: "bg-green-100 text-green-700", dot: "bg-green-500" },
  failed: { label: "Lỗi", cls: "bg-red-100 text-red-700", dot: "bg-red-500" },
};
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const postDate = (p: Post) => new Date(p.scheduledAt || p.publishedAt || p.createdAt);
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dtLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function PlannerPage() {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetFbId, setTargetFbId] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [compose, setCompose] = useState<Compose | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    fetch("/api/instagram/sources")
      .then((r) => r.json())
      .then((d) => {
        const t: Target[] = d.targets ?? [];
        setTargets(t);
        setTargetFbId((cur) => cur || t[0]?.fbPageId || "");
      })
      .catch(() => {});
  }, []);

  const days = useMemo(() => {
    if (view === "week") {
      const start = addDays(cursor, -cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const load = useCallback(async () => {
    if (days.length === 0) return;
    setLoading(true);
    try {
      const from = startOfDay(days[0]).toISOString();
      const to = addDays(days[days.length - 1], 1).toISOString();
      const r = await fetch(`/api/planner?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const d = await r.json();
      setPosts(Array.isArray(d) ? d : []);
    } catch {
      /* im lặng */
    } finally {
      setLoading(false);
    }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of posts) {
      if (targetFbId && p.targetFbId && p.targetFbId !== targetFbId) continue;
      const k = ymd(postDate(p));
      const arr = m.get(k) ?? [];
      arr.push(p);
      m.set(k, arr);
    }
    return m;
  }, [posts, targetFbId]);

  const title = `Tháng ${cursor.getMonth() + 1} ${cursor.getFullYear()}`;
  const step = (dir: number) => setCursor((c) => (view === "week" ? addDays(c, 7 * dir) : new Date(c.getFullYear(), c.getMonth() + dir, 1)));

  function openCompose(date?: Date, post?: Post) {
    setCompose({
      editingId: post?.id,
      caption: post?.content ?? "",
      asset: post
        ? { mediaType: post.mediaType ?? "TEXT", mediaUrls: post.mediaUrls ?? [], source: "existing", previewUrl: post.thumbnail }
        : null,
      when: dtLocal(post?.scheduledAt ? new Date(post.scheduledAt) : date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0) : new Date()),
      status: post?.status,
      fbPermalink: post?.fbPermalink,
    });
  }

  async function save(mode: "draft" | "schedule" | "publish") {
    if (!compose || !targetFbId) return;
    const body: Record<string, unknown> = {
      targetFbId,
      caption: compose.caption,
      mediaType: compose.asset?.mediaType ?? "TEXT",
      mediaUrls: compose.asset?.mediaUrls ?? [],
      source: compose.asset?.source,
      sourceIgMediaId: compose.asset?.sourceIgMediaId,
      sourceFbId: compose.asset?.sourceFbId,
    };
    if (mode === "schedule") body.scheduledAt = new Date(compose.when).toISOString();
    if (mode === "publish") body.publishNow = true;
    setSaving(true);
    try {
      const url = compose.editingId ? `/api/planner/${compose.editingId}` : "/api/planner";
      const r = await fetch(url, { method: compose.editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Lỗi");
      setNotice(mode === "draft" ? "Đã lưu nháp." : mode === "schedule" ? "Đã lên lịch." : "Đã đăng lên Page.");
      setCompose(null);
      load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  async function aiRewrite() {
    if (!compose || !targetFbId) return;
    setAiBusy(true);
    try {
      const r = await fetch("/api/instagram/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption: compose.caption, targetFbId }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.toString?.() ?? "Lỗi");
      setCompose((c) => (c ? { ...c, caption: d.caption } : c));
      setNotice(d.source === "ai" ? "AI đã viết lại caption." : "AI đang tắt — dùng caption gốc + hashtag.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setAiBusy(false);
    }
  }

  async function del(id: string) {
    if (!window.confirm("Xoá/huỷ bài này?")) return;
    await fetch(`/api/planner/${id}`, { method: "DELETE" });
    setCompose(null);
    setNotice("Đã xoá bài.");
    load();
  }

  const todayKey = ymd(new Date());
  const publishedEdit = compose?.status === "published";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Lịch nội dung</h1>
          <p className="text-sm text-gray-500">Tạo bài (upload hoặc chọn bài IG/FB cũ), viết caption, lên lịch hoặc đăng lên Trang Facebook.</p>
        </div>
        <button className="btn-primary" onClick={() => openCompose(cursor)}>+ Tạo bài</button>
      </div>

      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {(["week", "month"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-sm rounded-md ${view === v ? "bg-white shadow-sm font-medium" : "text-gray-600"}`}>
              {v === "week" ? "Tuần" : "Tháng"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-ghost px-2 py-1" onClick={() => step(-1)}>‹</button>
          <button className="btn-ghost px-3 py-1" onClick={() => setCursor(startOfDay(new Date()))}>Hôm nay</button>
          <button className="btn-ghost px-2 py-1" onClick={() => step(1)}>›</button>
        </div>
        <div className="font-semibold">{title}</div>
        <select className="input max-w-[280px] ml-auto" value={targetFbId} onChange={(e) => setTargetFbId(e.target.value)}>
          {targets.map((t) => (
            <option key={t.fbPageId} value={t.fbPageId}>{t.name}</option>
          ))}
        </select>
        {loading && <span className="text-xs text-gray-400">Đang tải…</span>}
      </div>

      {/* Lưới lịch */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
          {WD.map((w) => <div key={w} className="px-2 py-2 text-center">{w}</div>)}
        </div>
        <div className={`grid grid-cols-7 ${view === "week" ? "min-h-[60vh]" : ""}`}>
          {days.map((d, i) => {
            const key = ymd(d);
            const inMonth = view === "week" || d.getMonth() === cursor.getMonth();
            const dayPosts = byDay.get(key) ?? [];
            return (
              <div
                key={i}
                className={`border-b border-r border-gray-100 p-1.5 ${view === "week" ? "" : "min-h-[104px]"} ${inMonth ? "" : "bg-gray-50/60"} cursor-pointer hover:bg-blue-50/40`}
                onClick={() => openCompose(d)}
              >
                <div className={`text-xs mb-1 ${key === todayKey ? "text-brand font-bold" : inMonth ? "text-gray-500" : "text-gray-300"}`}>{d.getDate()}</div>
                <div className="space-y-1">
                  {dayPosts.map((p) => {
                    const s = STATUS[p.status] ?? STATUS.draft;
                    return (
                      <button
                        key={p.id}
                        onClick={(e) => { e.stopPropagation(); openCompose(undefined, p); }}
                        className={`w-full text-left rounded-md px-1.5 py-1 text-[11px] flex items-center gap-1.5 ${s.cls} hover:opacity-80`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                        <span className="font-medium shrink-0">{fmtTime(p.scheduledAt || p.publishedAt || p.createdAt)}</span>
                        {p.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnail} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                        ) : null}
                        <span className="truncate">{p.content || "(không caption)"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal soạn bài */}
      {compose && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onMouseDown={() => !saving && setCompose(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto" onMouseDown={(e) => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{compose.editingId ? "Sửa bài" : "Tạo bài mới"}</h3>
                <button className="text-gray-400 hover:text-gray-700" onClick={() => setCompose(null)}>✕</button>
              </div>

              {publishedEdit ? (
                <div className="text-sm text-gray-600">
                  Bài đã đăng.{compose.fbPermalink && <> <a className="text-brand" href={compose.fbPermalink} target="_blank" rel="noreferrer">Xem trên Facebook ↗</a></>}
                </div>
              ) : (
                <>
                  {/* Asset */}
                  {compose.asset?.previewUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={compose.asset.previewUrl} alt="" className="w-full max-h-56 object-contain rounded-lg bg-gray-100" />
                      <button className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5 text-xs shadow" onClick={() => setCompose((c) => c && { ...c, asset: null })}>Đổi ảnh ✕</button>
                    </div>
                  ) : (
                    <div>
                      <div className="label">Chọn ảnh/video (bỏ trống = bài chỉ có chữ)</div>
                      <AssetPicker onPick={(a) => setCompose((c) => (c ? { ...c, asset: a, caption: c.caption || a.caption || "" } : c))} />
                    </div>
                  )}

                  {/* Caption */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="label mb-0">Caption</span>
                      <button className="btn-ghost text-xs py-1 px-2" disabled={aiBusy} onClick={aiRewrite}>{aiBusy ? "Đang viết…" : "✨ Viết lại (AI)"}</button>
                    </div>
                    <textarea className="input min-h-[110px]" placeholder="Viết nội dung bài đăng…" value={compose.caption} onChange={(e) => setCompose((c) => c && { ...c, caption: e.target.value })} />
                  </div>

                  {/* Lịch */}
                  <div>
                    <label className="label">Thời gian (để lên lịch)</label>
                    <input type="datetime-local" className="input" value={compose.when} onChange={(e) => setCompose((c) => c && { ...c, when: e.target.value })} />
                    <p className="text-xs text-gray-400 mt-1">Facebook yêu cầu lịch cách hiện tại ~10 phút đến 75 ngày.</p>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-1">
                {compose.editingId && !publishedEdit && (
                  <button className="btn-ghost text-red-600" disabled={saving} onClick={() => del(compose.editingId!)}>Xoá</button>
                )}
                <div className="ml-auto flex gap-2">
                  <button className="btn-ghost" disabled={saving} onClick={() => setCompose(null)}>Đóng</button>
                  {!publishedEdit && (
                    <>
                      <button className="btn-ghost" disabled={saving} onClick={() => save("draft")}>Lưu nháp</button>
                      <button className="btn-ghost" disabled={saving} onClick={() => save("schedule")}>Lên lịch</button>
                      <button className="btn-primary" disabled={saving} onClick={() => save("publish")}>{saving ? "…" : "Đăng ngay"}</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed right-5 bottom-5 z-[60] bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-sm">{notice}</div>
      )}
    </div>
  );
}
