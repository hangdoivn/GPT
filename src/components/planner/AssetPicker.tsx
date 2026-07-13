"use client";

import { useCallback, useEffect, useState } from "react";

export interface PickedAsset {
  mediaType: string; // TEXT | IMAGE | VIDEO | CAROUSEL_ALBUM
  mediaUrls: string[];
  source: string; // upload | ig_repost | fb_repost | manual
  sourceIgMediaId?: string;
  sourceFbId?: string;
  previewUrl: string | null;
  caption?: string;
}

type Tab = "upload" | "ig" | "fb" | "url";
type Src = { fbPageId: string; name: string; igUsername?: string };
type IgItem = { id: string; caption: string | null; mediaType: string; mediaUrl: string | null; thumbnailUrl: string | null };
type FbItem = { id: string; message: string | null; imageUrl: string | null; permalink: string | null };

// Link TRANG (không phải file media) → Facebook không tải lên được.
const PAGE_HOSTS = ["instagram.com", "facebook.com", "m.facebook.com", "fb.watch", "tiktok.com", "vt.tiktok.com", "youtube.com", "youtu.be"];
function isPageUrl(u: string): boolean {
  try {
    const h = new URL(u).hostname.replace(/^www\./, "").toLowerCase();
    return PAGE_HOSTS.includes(h);
  } catch {
    return false;
  }
}

export function AssetPicker({ onPick }: { onPick: (a: PickedAsset) => void }) {
  const [tab, setTab] = useState<Tab>("upload");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // IG / FB
  const [sources, setSources] = useState<Src[]>([]);
  const [igSrc, setIgSrc] = useState("");
  const [igItems, setIgItems] = useState<IgItem[]>([]);
  const [fbItems, setFbItems] = useState<FbItem[]>([]);
  // URL
  const [urlVal, setUrlVal] = useState("");
  const [urlType, setUrlType] = useState("IMAGE");

  useEffect(() => {
    if ((tab === "ig" || tab === "fb") && sources.length === 0) {
      fetch("/api/instagram/sources")
        .then((r) => r.json())
        .then((d) => {
          const srcs: Src[] = d.sources ?? [];
          const extra: Src[] = (d.targets ?? []).filter((t: Src) => !srcs.some((s) => s.fbPageId === t.fbPageId));
          setSources([...srcs, ...extra]);
        })
        .catch(() => {});
    }
  }, [tab, sources.length]);

  const loadIg = useCallback(async (fbId: string) => {
    setIgSrc(fbId);
    if (!fbId) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/instagram/media?sourceFbId=${encodeURIComponent(fbId)}&targetFbId=${encodeURIComponent(fbId)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Lỗi");
      setIgItems(d.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải bài IG");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadFb = useCallback(async (fbId: string) => {
    setIgSrc(fbId);
    if (!fbId) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/planner/fb-posts?pageFbId=${encodeURIComponent(fbId)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Lỗi");
      setFbItems(d ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải bài FB");
    } finally {
      setBusy(false);
    }
  }, []);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/uploads", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Upload lỗi");
      onPick({ mediaType: d.mediaType, mediaUrls: [d.url], source: "upload", previewUrl: d.url });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload lỗi");
    } finally {
      setBusy(false);
    }
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => { setTab(t); setErr(null); }}
      className={`px-3 py-1.5 text-sm rounded-lg ${tab === t ? "bg-brand text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {tabBtn("upload", "⬆️ Upload")}
        {tabBtn("ig", "📸 Từ Instagram")}
        {tabBtn("fb", "📘 Từ Facebook")}
        {tabBtn("url", "🔗 Dán link")}
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}

      {tab === "upload" && (
        <div>
          <input
            type="file"
            accept="image/*,video/mp4,video/quicktime"
            disabled={busy}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            className="input"
          />
          <p className="text-xs text-gray-400 mt-1">Ảnh (JPG/PNG/WEBP/GIF) hoặc video (MP4/MOV), tối đa 60MB.</p>
          {busy && <p className="text-sm text-gray-500 mt-1">Đang tải lên…</p>}
        </div>
      )}

      {tab === "ig" && (
        <div className="space-y-2">
          <select className="input" value={igSrc} onChange={(e) => loadIg(e.target.value)}>
            <option value="">— Chọn tài khoản Instagram —</option>
            {sources.filter((s) => s.igUsername).map((s) => (
              <option key={s.fbPageId} value={s.fbPageId}>@{s.igUsername} (qua {s.name})</option>
            ))}
          </select>
          {busy && <p className="text-sm text-gray-500">Đang tải…</p>}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-auto">
            {igItems.map((it) => (
              <button
                type="button"
                key={it.id}
                onClick={() => onPick({
                  mediaType: it.mediaType,
                  mediaUrls: it.mediaUrl ? [it.mediaUrl] : [],
                  source: "ig_repost",
                  sourceIgMediaId: it.id,
                  sourceFbId: igSrc,
                  previewUrl: it.thumbnailUrl || it.mediaUrl,
                  caption: it.caption ?? "",
                })}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 ring-brand"
              >
                {(it.thumbnailUrl || it.mediaUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.thumbnailUrl || it.mediaUrl || ""} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : null}
                {it.mediaType?.toUpperCase() === "VIDEO" && <span className="absolute bottom-1 right-1 text-white text-xs">🎬</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "fb" && (
        <div className="space-y-2">
          <select className="input" value={igSrc} onChange={(e) => loadFb(e.target.value)}>
            <option value="">— Chọn Trang Facebook —</option>
            {sources.map((s) => (
              <option key={s.fbPageId} value={s.fbPageId}>{s.name}</option>
            ))}
          </select>
          {busy && <p className="text-sm text-gray-500">Đang tải…</p>}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-auto">
            {fbItems.map((it) => (
              <button
                type="button"
                key={it.id}
                onClick={() => onPick({
                  mediaType: "IMAGE",
                  mediaUrls: it.imageUrl ? [it.imageUrl] : [],
                  source: "fb_repost",
                  previewUrl: it.imageUrl,
                  caption: it.message ?? "",
                })}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 ring-brand"
              >
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "url" && (
        <div className="space-y-2">
          <input className="input" placeholder="Dán URL FILE ảnh/video trực tiếp (vd …/video.mp4)…" value={urlVal} onChange={(e) => setUrlVal(e.target.value)} />
          <div className="flex items-center gap-2">
            <select className="input max-w-[140px]" value={urlType} onChange={(e) => setUrlType(e.target.value)}>
              <option value="IMAGE">Ảnh</option>
              <option value="VIDEO">Video</option>
            </select>
            <button
              type="button"
              className="btn-primary"
              disabled={!urlVal.trim()}
              onClick={() => {
                const u = urlVal.trim();
                if (isPageUrl(u)) {
                  setErr("Đây là link TRANG (Reel/bài viết), KHÔNG phải file media — Facebook không tải lên được. Để lấy Reel/Video/ảnh từ Instagram của bạn, dùng tab “📸 Từ Instagram”. Hoặc dán link file trực tiếp (…/abc.mp4, …/abc.jpg).");
                  return;
                }
                onPick({ mediaType: urlType, mediaUrls: [u], source: "manual", previewUrl: u });
              }}
            >
              Dùng link này
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Cần link FILE trực tiếp. Muốn đăng Reel/Video từ Instagram → dùng tab <b>“📸 Từ Instagram”</b> (app tự lấy link video thật), đừng dán link trang instagram.com/reel/…
          </p>
        </div>
      )}
    </div>
  );
}
