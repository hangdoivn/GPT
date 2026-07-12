// Viết lại caption Instagram theo "định vị fanpage" bằng Claude (Opus mặc định).
// App không có SDK AI → gọi Anthropic API bằng raw fetch (giống văn phong fetch của
// facebook/client.ts). FALLBACK rule-based khi thiếu ANTHROPIC_API_KEY / lỗi → không
// bao giờ chặn luồng (người vẫn duyệt/sửa caption được).

export interface Positioning {
  pageName?: string | null;
  audience?: string | null;
  voice?: string | null;
  hashtags?: string | null;
  cta?: string | null;
  notes?: string | null;
}

export interface RewriteResult {
  caption: string;
  source: "ai" | "fallback";
  model: string | null;
  fallbackReason?: string;
}

function model(): string {
  return process.env.IG_CAPTION_MODEL || "claude-opus-4-8";
}

const SYSTEM_PROMPT = `Bạn là copywriter mạng xã hội của Hàng Đôi Production, viết caption tiếng Việt cho một FANPAGE FACEBOOK.
Bạn nhận JSON gồm "originalCaption" (caption gốc trên Instagram) và "positioning" (định vị fanpage đích).

NHIỆM VỤ: viết lại caption gốc để đăng lên fanpage đích sao cho khớp định vị (giọng điệu, đối tượng, CTA, hashtag) nhưng GIỮ nguyên thông điệp & sự thật cốt lõi.

QUY TẮC BẮT BUỘC:
- KHÔNG bịa thêm số liệu, khuyến mãi, giải thưởng, cam kết hay thông tin không có trong caption gốc.
- Giữ đúng tinh thần/nội dung gốc; chỉ đổi cách diễn đạt cho hợp fanpage đích.
- Áp giọng điệu (voice) và hướng tới đối tượng (audience) nếu được cung cấp.
- Nếu có "cta", chèn lời kêu gọi hành động tự nhiên ở cuối.
- Nếu có "hashtags", thêm vào cuối; không lặp lại hashtag đã có sẵn.
- Độ dài hợp lý cho Facebook; xuống dòng thoáng, dễ đọc. Được dùng emoji nếu hợp giọng điệu.
- Nếu caption gốc trống, viết một caption ngắn phù hợp định vị dựa trên bối cảnh có sẵn, KHÔNG bịa chi tiết cụ thể.

ĐẦU RA: chỉ trả về DUY NHẤT một object JSON hợp lệ (không markdown, không giải thích), đúng dạng:
{"caption": "nội dung caption đã viết lại"}`;

export async function rewriteCaption(originalCaption: string, positioning: Positioning): Promise<RewriteResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { caption: fallbackCaption(originalCaption, positioning), source: "fallback", model: null, fallbackReason: "missing_api_key" };
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model(),
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              originalCaption: originalCaption || "",
              positioning: {
                pageName: positioning.pageName || null,
                audience: positioning.audience || null,
                voice: positioning.voice || null,
                hashtags: positioning.hashtags || null,
                cta: positioning.cta || null,
                notes: positioning.notes || null,
              },
            }),
          },
        ],
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      content?: Array<{ type?: string; text?: string }>;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json?.error?.message || `Anthropic HTTP ${res.status}`);
    const text = (Array.isArray(json.content) ? json.content : [])
      .filter((b) => b?.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n")
      .trim();
    const caption = parseCaption(text);
    if (caption) return { caption, source: "ai", model: model() };
    return { caption: fallbackCaption(originalCaption, positioning), source: "fallback", model: null, fallbackReason: "ai_empty_output" };
  } catch (e) {
    return {
      caption: fallbackCaption(originalCaption, positioning),
      source: "fallback",
      model: null,
      fallbackReason: `ai_error:${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/** Ưu tiên JSON {"caption":...}; nếu không parse được, dùng chính text đã dọn fence. */
function parseCaption(text: string): string | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1)) as { caption?: unknown };
      if (typeof obj.caption === "string" && obj.caption.trim()) return obj.caption.trim();
    } catch {
      /* rơi xuống dùng text thô */
    }
  }
  return cleaned || null;
}

/** Caption deterministic khi AI không khả dụng: giữ caption gốc + CTA + hashtag. KHÔNG bịa. */
function fallbackCaption(originalCaption: string, positioning: Positioning): string {
  const parts: string[] = [];
  const base = (originalCaption || "").trim();
  if (base) parts.push(base);

  const cta = (positioning.cta || "").trim();
  if (cta && !base.toLowerCase().includes(cta.toLowerCase())) parts.push(cta);

  const hashtags = (positioning.hashtags || "").trim();
  if (hashtags) {
    const existing = base.toLowerCase();
    const tags = hashtags
      .split(/\s+/)
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .filter((t) => t.length > 1 && !existing.includes(t.toLowerCase()));
    if (tags.length) parts.push(tags.join(" "));
  }

  return parts.join("\n\n").trim();
}
