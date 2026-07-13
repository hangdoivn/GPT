"use client";

import { useCallback, useEffect, useState } from "react";

interface Src {
  fbPageId: string;
  name: string;
  igUserId: string;
  igUsername?: string;
}
interface Tgt {
  fbPageId: string;
  name: string;
  followers: number;
}
type Copy = { status: string; fbPermalink: string | null; rewrittenCaption: string | null; error: string | null } | null;
interface Media {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  childrenCount: number;
  copy: Copy;
}
interface Positioning {
  pageId?: string;
  pageName?: string | null;
  audience?: string | null;
  voice?: string | null;
  hashtags?: string | null;
  cta?: string | null;
  notes?: string | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chưa copy", cls: "bg-gray-100 text-gray-600" },
  rewritten: { label: "Đã viết lại", cls: "bg-amber-100 text-amber-700" },
  published: { label: "Đã đăng", cls: "bg-green-100 text-green-700" },
  failed: { label: "Lỗi", cls: "bg-red-100 text-red-700" },
};

function mediaTypeLabel(t: string): string {
  const up = String(t || "").toUpperCase();
  return up === "VIDEO" ? "🎬 Video" : up === "CAROUSEL_ALBUM" ? "🖼 Album" : "📷 Ảnh";
}

export default function RepostPage() {
  const [connected, setConnected] = useState(true);
  const [sources, setSources] = useState<Src[]>([]);
  const [targets, setTargets] = useState<Tgt[]>([]);
  const [sourceFbId, setSourceFbId] = useState("");
  const [targetFbId, setTargetFbId] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [nextAfter, setNextAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showPos, setShowPos] = useState(false);
  const [pos, setPos] = useState<Positioning>({});
  const [savingPos, setSavingPos] = useState(false);

  const notify = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout((notify as unknown as { t?: number }).t);
    (notify as unknown as { t?: number }).t = window.setTimeout(() => setMsg(null), 4200);
  }, []);

  // Nạp danh sách nguồn + đích.
  useEffect(() => {
    fetch("/api/instagram/sources")
      .then((r) => r.json())
      .then((d) => {
        setConnected(d.connected !== false);
        setSources(d.sources ?? []);
        setTargets(d.targets ?? []);
        if (d.sources?.[0]) setSourceFbId(d.sources[0].fbPageId);
        if (d.targets?.[0]) setTargetFbId(d.targets[0].fbPageId);
      })
      .catch(() => setConnected(false));
  }, []);

  // Nạp định vị khi đổi page đích.
  useEffect(() => {
    if (!targetFbId) return;
    fetch(`/api/instagram/positioning?pageId=${encodeURIComponent(targetFbId)}`)
      .then((r) => r.json())
      .then((d) => setPos(d ?? {}))
      .catch(() => setPos({}));
  }, [targetFbId]);

  const loadMedia = useCallback(
    async (reset: boolean) => {
      if (!sourceFbId || !targetFbId) return;
      setLoading(true);
      setLoadErr(null);
      try {
        const after = !reset && nextAfter ? `&after=${encodeURIComponent(nextAfter)}` : "";
        const res = await fetch(
          `/api/instagram/media?sourceFbId=${encodeURIComponent(sourceFbId)}&targetFbId=${encodeURIComponent(targetFbId)}${after}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Lỗi tải bài");
        setMedia((prev) => (reset ? data.items : [...prev, ...data.items]));
        setNextAfter(data.nextAfter ?? null);
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : "Lỗi tải bài");
      } finally {
        setLoading(false);
      }
    },
    [sourceFbId, targetFbId, nextAfter],
  );

  async function savePositioning() {
    setSavingPos(true);
    try {
      const res = await fetch("/api/instagram/positioning", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: targetFbId, ...pos }),
      });
      if (!res.ok) throw new Error("Lỗi lưu");
      notify("Đã lưu định vị page đích.");
    } catch {
      notify("Không lưu được định vị.");
    } finally {
      setSavingPos(false);
    }
  }

  const setP = (k: keyof Positioning) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setPos((cur) => ({ ...cur, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Copy từ Instagram</h1>
        <p className="text-sm text-gray-500">
          Kéo bài từ Instagram, để AI viết lại caption theo định vị page đích, duyệt rồi đăng sang Fanpage. Đã đăng thì
          không copy lại.
        </p>
      </div>

      {!connected && (
        <div className="card p-4 text-sm text-amber-700 bg-amber-50">
          Chưa kết nối Facebook. Vào <b>Cài đặt</b> để đăng nhập và cấp quyền.
        </div>
      )}

      {connected && sources.length === 0 && (
        <div className="card p-4 text-sm text-amber-700 bg-amber-50 space-y-1">
          <div className="font-semibold">Chưa bật đọc bài Instagram</div>
          <div>
            Cần 3 bước: (1) Thêm sản phẩm <b>Instagram</b> cho Facebook App tại developers.facebook.com (Add product →
            Instagram / <i>Instagram API with Facebook Login</i>); (2) đặt <code>ENABLE_IG_SCOPE=1</code> trong{" "}
            <code>.env</code> rồi khởi động lại app; (3) vào <b>Cài đặt → đăng nhập lại Facebook</b>, đảm bảo IG đã nối
            Page. <span className="text-amber-600">Đăng bài lên Page vẫn hoạt động bình thường ngay bây giờ.</span>
          </div>
        </div>
      )}

      {/* Bộ chọn nguồn → đích */}
      <div className="card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nguồn — Instagram</label>
            <select className="input" value={sourceFbId} onChange={(e) => setSourceFbId(e.target.value)}>
              {sources.length === 0 && <option value="">(chưa có IG nào)</option>}
              {sources.map((s) => (
                <option key={s.fbPageId} value={s.fbPageId}>
                  {s.igUsername ? `@${s.igUsername}` : s.name} — qua page {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Đích — Fanpage đăng sang</label>
            <select className="input" value={targetFbId} onChange={(e) => setTargetFbId(e.target.value)}>
              {targets.map((t) => (
                <option key={t.fbPageId} value={t.fbPageId}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-primary" disabled={loading || !sourceFbId || !targetFbId} onClick={() => loadMedia(true)}>
            {loading ? "Đang tải…" : "Kéo bài Instagram"}
          </button>
          <button className="btn-ghost" onClick={() => setShowPos((v) => !v)}>
            {showPos ? "Ẩn định vị" : "Định vị page đích"}
          </button>
          {media.length > 0 && <span className="text-xs text-gray-400">{media.length} bài đã tải</span>}
        </div>
        {msg && <div className="text-sm text-gray-600">{msg}</div>}
      </div>

      {/* Định vị page đích */}
      {showPos && (
        <div className="card p-4 space-y-3">
          <div className="font-semibold text-sm">Định vị page đích (AI dùng để viết lại caption)</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Tên fanpage</label>
              <input className="input" value={pos.pageName ?? ""} onChange={setP("pageName")} placeholder="VD: Hàng Đôi Studio" />
            </div>
            <div>
              <label className="label">Hashtag mặc định</label>
              <input className="input" value={pos.hashtags ?? ""} onChange={setP("hashtags")} placeholder="#hangdoi #danang" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Giọng điệu / phong cách</label>
              <textarea className="input min-h-[60px]" value={pos.voice ?? ""} onChange={setP("voice")} placeholder="VD: chuyên nghiệp nhưng gần gũi, truyền cảm hứng, câu ngắn, emoji vừa phải" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Đối tượng khách hàng</label>
              <textarea className="input min-h-[60px]" value={pos.audience ?? ""} onChange={setP("audience")} placeholder="VD: chủ shop F&B tại Đà Nẵng cần chụp không gian/sản phẩm" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Lời kêu gọi hành động (CTA)</label>
              <input className="input" value={pos.cta ?? ""} onChange={setP("cta")} placeholder="VD: Inbox nhận báo giá 👉" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Ghi chú thêm cho AI</label>
              <textarea className="input min-h-[60px]" value={pos.notes ?? ""} onChange={setP("notes")} placeholder="VD: tránh nói giảm giá; luôn nhắc studio ở Đà Nẵng" />
            </div>
          </div>
          <button className="btn-primary" disabled={savingPos || !targetFbId} onClick={savePositioning}>
            {savingPos ? "Đang lưu…" : "Lưu định vị"}
          </button>
        </div>
      )}

      {loadErr && <div className="card p-4 text-sm text-red-600 bg-red-50">{loadErr}</div>}

      {/* Lưới bài IG */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {media.map((m) => (
          <PostCard key={m.id} media={m} sourceFbId={sourceFbId} targetFbId={targetFbId} notify={notify} />
        ))}
      </div>

      {nextAfter && (
        <div className="text-center">
          <button className="btn-ghost" disabled={loading} onClick={() => loadMedia(false)}>
            {loading ? "Đang tải…" : "Tải thêm"}
          </button>
        </div>
      )}
    </div>
  );
}

function PostCard({
  media,
  sourceFbId,
  targetFbId,
  notify,
}: {
  media: Media;
  sourceFbId: string;
  targetFbId: string;
  notify: (m: string) => void;
}) {
  const [copy, setCopy] = useState<Copy>(media.copy);
  const [draft, setDraft] = useState(media.copy?.rewrittenCaption ?? media.caption ?? "");
  const [editing, setEditing] = useState(Boolean(media.copy?.rewrittenCaption));
  const [rewriting, setRewriting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  const status = copy?.status ?? "pending";
  const published = status === "published" && Boolean(copy?.fbPermalink);
  const thumb = media.thumbnailUrl || media.mediaUrl;
  const s = STATUS_LABEL[status] ?? STATUS_LABEL.pending;

  async function rewrite() {
    setRewriting(true);
    try {
      const res = await fetch("/api/instagram/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igMediaId: media.id, caption: media.caption ?? "", sourceFbId, targetFbId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString?.() ?? "Lỗi");
      setDraft(data.caption);
      setEditing(true);
      setCopy((c) => ({ status: c?.status === "published" ? "published" : "rewritten", fbPermalink: c?.fbPermalink ?? null, rewrittenCaption: data.caption, error: null }));
      notify(data.source === "ai" ? "Đã viết lại caption bằng AI." : "AI đang tắt — dùng caption gốc + hashtag định vị.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Không viết lại được.");
    } finally {
      setRewriting(false);
    }
  }

  async function doPublish() {
    setPublishing(true);
    try {
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igMediaId: media.id, sourceFbId, targetFbId, caption: draft, mediaType: media.mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.toString?.() ?? "Lỗi");
      setCopy({ status: "published", fbPermalink: data.fbPermalink, rewrittenCaption: draft, error: null });
      setConfirm(false);
      notify(data.processing ? "Đã gửi video sang Page (Facebook đang xử lý)." : "Đã đăng sang Page.");
    } catch (e) {
      setConfirm(false);
      notify(e instanceof Error ? e.message : "Đăng thất bại.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-gray-100">
        {thumb && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setImgOk(false)} />
        ) : (
          <div className="w-full h-full grid place-items-center text-3xl text-gray-300">{mediaTypeLabel(media.mediaType).split(" ")[0]}</div>
        )}
        <span className="absolute top-2 left-2 text-[11px] bg-black/65 text-white px-2 py-0.5 rounded-full">
          {mediaTypeLabel(media.mediaType)}
          {media.mediaType.toUpperCase() === "CAROUSEL_ALBUM" ? ` · ${media.childrenCount}` : ""}
        </span>
        <span className={`badge absolute top-2 right-2 ${s.cls}`}>{s.label}</span>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {!editing ? (
          <p className={`text-xs whitespace-pre-wrap max-h-24 overflow-hidden ${media.caption ? "text-gray-600" : "text-gray-400 italic"}`}>
            {media.caption || "(Không có caption gốc)"}
          </p>
        ) : (
          <textarea
            className="input text-sm min-h-[110px]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={published}
          />
        )}

        <div className="flex gap-2 flex-wrap mt-auto">
          {published ? (
            <>
              <a className="text-xs text-green-700 font-medium inline-flex items-center gap-1" href={copy?.fbPermalink || "#"} target="_blank" rel="noreferrer">
                ↗ Xem trên Page
              </a>
              {media.permalink && (
                <a className="btn-ghost text-xs py-1 px-2" href={media.permalink} target="_blank" rel="noreferrer">
                  Bài IG gốc
                </a>
              )}
            </>
          ) : (
            <>
              <button className="btn-ghost text-xs py-1 px-2" disabled={rewriting || publishing} onClick={rewrite}>
                {rewriting ? "Đang viết…" : editing ? "✨ Viết lại lần nữa" : "✨ Viết lại (AI)"}
              </button>
              <button className="btn-primary text-xs py-1 px-2" disabled={publishing || rewriting} onClick={() => setConfirm(true)}>
                {publishing ? "Đang đăng…" : "Đăng sang Page"}
              </button>
            </>
          )}
        </div>
        {status === "failed" && copy?.error && <div className="text-[11px] text-red-600">Lần trước lỗi: {copy.error}</div>}
      </div>

      {confirm && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onMouseDown={() => !publishing && setConfirm(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onMouseDown={(e) => e.stopPropagation()}>
            <div className="font-semibold mb-2">Đăng {mediaTypeLabel(media.mediaType).split(" ")[1]?.toLowerCase() || "bài"} sang Page?</div>
            <p className="text-sm text-gray-500 mb-2">Bài sẽ đăng công khai lên page đích với caption dưới đây.</p>
            <div className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-44 overflow-auto mb-3">
              {draft || media.caption || "(không có caption)"}
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" disabled={publishing} onClick={() => setConfirm(false)}>Huỷ</button>
              <button className="btn-primary" disabled={publishing} onClick={doPublish}>
                {publishing ? "Đang đăng…" : "Đăng ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
