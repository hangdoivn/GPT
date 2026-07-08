// Phát hiện "lead ảo" trong Messenger — nick bơm để đủ số lượng mess
// (nghi do Meta giao lượt rẻ hoặc đối tác chạy ads làm đẹp KPI).
// Vân tay nick ảo: nhắn 1 câu rồi im, tên không phân giải, trùng nội dung,
// dồn thời gian, không để SĐT. Thuần logic -> dễ test, cho bằng chứng để đối chất.

import type { Finding } from "./insights-analysis";

export interface FakeConvInput {
  id: string;
  name: string;
  nameResolved: boolean;
  customerMsgCount: number;
  pageReplied: boolean;
  repliedAfterPage: boolean;
  customerChars: number;
  customerText: string; // đã chuẩn hoá (lowercase, trim)
  hasPhone: boolean;
  firstMsgMs: number; // thời điểm tin đầu (ms); NaN nếu không có
}

export interface FakeConvResult {
  id: string;
  name: string;
  risk: number; // 0-100
  reasons: string[];
}

export interface FakeReport {
  total: number;
  suspectCount: number;
  suspectRate: number; // %
  band: "clean" | "mixed" | "injected";
  verdict: string;
  signalCounts: { noName: number; oneAndGone: number; tooShort: number; noPhone: number };
  dupClusters: { text: string; count: number }[];
  burst: { maxInWindow: number; windowMin: number };
  evidence: string[];
  findings: Finding[];
  conversations: FakeConvResult[]; // xếp nghi ngờ cao trước
}

const BURST_WINDOW_MS = 10 * 60 * 1000; // 10 phút

function scoreConv(c: FakeConvInput): FakeConvResult {
  let risk = 0;
  const reasons: string[] = [];
  const oneAndGone = c.customerMsgCount <= 1 && !c.repliedAfterPage;
  if (oneAndGone) { risk += 35; reasons.push("Nhắn 1 câu rồi im — không đối thoại tiếp"); }
  if (!c.nameResolved) { risk += 25; reasons.push("Tên không phân giải (thường nick khoá/ảo)"); }
  if (c.customerChars < 8) { risk += 20; reasons.push("Tin quá ngắn / chung chung"); }
  if (!c.hasPhone) { risk += 15; reasons.push("Không để lại số điện thoại"); }
  return { id: c.id, name: c.name, risk: Math.min(100, risk), reasons };
}

export function analyzeFakeLeads(convs: FakeConvInput[]): FakeReport {
  const total = convs.length;
  const results = convs.map(scoreConv).sort((a, b) => b.risk - a.risk);
  const suspectCount = results.filter((r) => r.risk >= 50).length;
  const suspectRate = total ? Math.round((suspectCount / total) * 1000) / 10 : 0;

  const signalCounts = {
    noName: convs.filter((c) => !c.nameResolved).length,
    oneAndGone: convs.filter((c) => c.customerMsgCount <= 1 && !c.repliedAfterPage).length,
    tooShort: convs.filter((c) => c.customerChars < 8).length,
    noPhone: convs.filter((c) => !c.hasPhone).length,
  };

  // Trùng nội dung: nhiều hội thoại cùng 1 câu y hệt = kịch bản bơm.
  const dupMap = new Map<string, number>();
  for (const c of convs) {
    const t = c.customerText.trim();
    if (t.length >= 2) dupMap.set(t, (dupMap.get(t) ?? 0) + 1);
  }
  const dupClusters = [...dupMap.entries()]
    .filter(([, n]) => n >= 3)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Dồn thời gian: nhiều hội thoại bắt đầu trong cùng cửa sổ 10 phút.
  const times = convs.map((c) => c.firstMsgMs).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
  let maxInWindow = times.length ? 1 : 0;
  let lo = 0;
  for (let hi = 0; hi < times.length; hi++) {
    while (times[hi] - times[lo] > BURST_WINDOW_MS) lo++;
    maxInWindow = Math.max(maxInWindow, hi - lo + 1);
  }

  const bigDup = dupClusters.length > 0 && dupClusters[0].count >= Math.max(4, total * 0.08);
  const burstHit = maxInWindow >= 10;

  let band: FakeReport["band"];
  if (suspectRate >= 50 || bigDup || burstHit) band = "injected";
  else if (suspectRate >= 20) band = "mixed";
  else band = "clean";

  const evidence: string[] = [];
  if (signalCounts.oneAndGone > 0) evidence.push(`${Math.round((signalCounts.oneAndGone / (total || 1)) * 100)}% inbox nhắn đúng 1 câu rồi im (${signalCounts.oneAndGone}/${total}).`);
  if (signalCounts.noName > 0) evidence.push(`${Math.round((signalCounts.noName / (total || 1)) * 100)}% inbox tên không phân giải (${signalCounts.noName}/${total}).`);
  if (dupClusters.length) evidence.push(`Câu "${dupClusters[0].text.slice(0, 40)}${dupClusters[0].text.length > 40 ? "…" : ""}" lặp ${dupClusters[0].count} lần từ ${dupClusters[0].count} nick khác nhau.`);
  if (burstHit) evidence.push(`${maxInWindow} inbox dồn trong 10 phút — dấu hiệu bơm theo mẻ.`);

  const findings: Finding[] = [];
  if (total === 0) {
    findings.push({ sentiment: "info", title: "Chưa có hội thoại Messenger để quét", detail: "Đồng bộ Facebook để kéo hội thoại về rồi quét lại." });
    return { total, suspectCount, suspectRate, band: "clean", verdict: "Chưa có dữ liệu.", signalCounts, dupClusters, burst: { maxInWindow, windowMin: 10 }, evidence, findings, conversations: results };
  }

  let verdict: string;
  if (band === "injected") {
    verdict = `Dấu hiệu MẠNH bị bơm lead ảo: ${suspectRate}% inbox đáng ngờ${bigDup ? ", có kịch bản trùng câu" : ""}${burstHit ? ", có mẻ dồn thời gian" : ""}. Đây là bằng chứng để đối chất Meta/đối tác hoặc ngừng trả cho lượt ảo.`;
  } else if (band === "mixed") {
    verdict = `Hỗn hợp: ${suspectRate}% inbox đáng ngờ. Có lẫn nick ảo — nên siết targeting & đổi tối ưu, đồng thời theo dõi thêm.`;
  } else {
    verdict = `Chủ yếu là inbox thật (${suspectRate}% đáng ngờ). Chất lượng Messenger ổn.`;
  }

  findings.push({
    sentiment: band === "injected" ? "bad" : band === "mixed" ? "warn" : "good",
    title: `${suspectRate}% inbox có dấu hiệu ảo (${suspectCount}/${total})`,
    detail: verdict,
  });
  if (dupClusters.length) {
    findings.push({ sentiment: "bad", title: `Phát hiện ${dupClusters.length} nhóm tin trùng lặp`, detail: `Nhiều nick nhắn y hệt nhau — dấu hiệu kịch bản bơm tự động. Trùng nhiều nhất: "${dupClusters[0].text.slice(0, 50)}" ×${dupClusters[0].count}.` });
  }
  if (burstHit) {
    findings.push({ sentiment: "warn", title: `Có mẻ ${maxInWindow} inbox dồn trong 10 phút`, detail: "Inbox thật thường rải theo thời gian; dồn mẻ là dấu hiệu bơm. (Lưu ý: bài viral cũng có thể gây dồn — xem kèm các dấu hiệu khác.)" });
  }

  return { total, suspectCount, suspectRate, band, verdict, signalCounts, dupClusters, burst: { maxInWindow, windowMin: 10 }, evidence, findings, conversations: results };
}
