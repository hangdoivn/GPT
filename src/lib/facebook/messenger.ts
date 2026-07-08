// Đọc hội thoại Messenger của page -> rút "lead": tên khách + SĐT (tách từ tin nhắn).
// Dùng cho page chạy Click-to-Messenger ads (không có Lead Form).
// Cần quyền pages_messaging. https://developers.facebook.com/docs/graph-api/reference/page/conversations

import { graphAll, type FacebookConfig } from "./client";
import { checkPhone } from "../scoring/phone";

export interface MessengerLead {
  conversationId: string;
  psid: string; // id khách (participant không phải page)
  fullName: string;
  phone?: string; // SĐT tách được từ tin nhắn khách
  lastMessage?: string;
  updatedTime: string;
  // ── Tín hiệu phát hiện nick ảo ──
  customerMsgCount: number; // số tin khách gửi
  pageReplied: boolean; // page đã trả lời chưa
  repliedAfterPage: boolean; // khách có nhắn tiếp sau khi page trả lời (người thật hay tiếp)
  customerChars: number; // tổng độ dài text khách
  customerText: string; // text khách (chuẩn hoá) để soi trùng
  firstMsgTime: string; // ISO thời điểm tin đầu (soi dồn thời gian)
  nameResolved: boolean; // tên có phân giải thật (không phải placeholder)
}

// Tên placeholder Facebook trả khi không phân giải được (thường nick ảo/khoá).
const PLACEHOLDER_NAME_RE = /^(ngư[oờ]i dùng facebook|\(?khách messenger\)?|facebook user)$/i;

interface RawParticipant {
  id: string;
  name?: string;
}
interface RawMessage {
  message?: string;
  from?: { id?: string; name?: string };
  created_time?: string;
}
interface RawConversation {
  id: string;
  updated_time?: string;
  participants?: { data: RawParticipant[] };
  messages?: { data: RawMessage[] };
}

// Bắt chuỗi giống SĐT VN trong văn bản tự do (có thể có khoảng trắng/./-, tiền tố sdt).
const PHONE_CANDIDATE_RE = /(?:\+?84|0)[\d.\-\s]{8,13}/g;

/** Tách SĐT hợp lệ đầu tiên từ text; nếu không hợp lệ trả ứng viên thô để engine đánh rác. */
export function extractPhone(text: string): string | undefined {
  const matches = text.match(PHONE_CANDIDATE_RE);
  if (!matches) return undefined;
  for (const m of matches) {
    const c = checkPhone(m);
    if (c.valid && c.normalized) return c.normalized;
  }
  const raw = matches[0].replace(/[^\d+]/g, "");
  return raw || undefined;
}

/** Lấy hội thoại Messenger gần đây, rút thành lead. */
export async function fetchConversations(
  cfg: Pick<FacebookConfig, "pageId" | "pageAccessToken">,
  maxPages = 10,
): Promise<MessengerLead[]> {
  const convs = await graphAll<RawConversation>(
    `${cfg.pageId}/conversations`,
    {
      token: cfg.pageAccessToken,
      params: {
        platform: "messenger",
        fields: "id,updated_time,participants,messages.limit(30){message,from,created_time}",
        limit: 50,
      },
    },
    maxPages,
  );

  const out: MessengerLead[] = [];
  for (const c of convs) {
    const parts = c.participants?.data ?? [];
    const customer = parts.find((p) => p.id !== cfg.pageId) ?? parts[0];
    if (!customer) continue;

    const msgs = c.messages?.data ?? [];
    const custMsgs = msgs.filter((m) => m.from?.id && m.from.id !== cfg.pageId);
    const pageMsgs = msgs.filter((m) => m.from?.id === cfg.pageId);
    const customerText = custMsgs.map((m) => m.message ?? "").join(" ");

    const ts = (m: RawMessage) => Date.parse(m.created_time ?? "");
    const allTimes = msgs.map(ts).filter((n) => !Number.isNaN(n));
    const firstMsgMs = allTimes.length ? Math.min(...allTimes) : NaN;
    const pageTimes = pageMsgs.map(ts).filter((n) => !Number.isNaN(n));
    const firstPageMs = pageTimes.length ? Math.min(...pageTimes) : NaN;
    const repliedAfterPage =
      !Number.isNaN(firstPageMs) && custMsgs.some((m) => { const t = ts(m); return !Number.isNaN(t) && t > firstPageMs; });

    const rawName = customer.name?.trim() ?? "";
    const nameResolved = rawName.length > 0 && !PLACEHOLDER_NAME_RE.test(rawName);

    out.push({
      conversationId: c.id,
      psid: customer.id,
      fullName: rawName || "(khách Messenger)",
      phone: extractPhone(customerText),
      lastMessage: msgs[0]?.message,
      updatedTime: c.updated_time ?? "",
      customerMsgCount: custMsgs.length,
      pageReplied: pageMsgs.length > 0,
      repliedAfterPage,
      customerChars: customerText.trim().length,
      customerText: customerText.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120),
      firstMsgTime: Number.isNaN(firstMsgMs) ? (c.updated_time ?? "") : new Date(firstMsgMs).toISOString(),
      nameResolved,
    });
  }
  return out;
}
