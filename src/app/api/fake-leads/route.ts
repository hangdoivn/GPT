import { NextResponse } from "next/server";
import { isConnected, resolveConfig } from "@/lib/facebook/auth";
import { fetchConversations } from "@/lib/facebook/messenger";
import { analyzeFakeLeads, type FakeConvInput } from "@/lib/fake-detection";

export const dynamic = "force-dynamic";

// GET /api/fake-leads — quét hội thoại Messenger, phát hiện dấu hiệu nick ảo.
export async function GET() {
  if (!(await isConnected())) {
    return NextResponse.json({ connected: false, error: "Chưa kết nối Facebook." }, { status: 200 });
  }
  const cfg = await resolveConfig();
  try {
    const convs = await fetchConversations(cfg);
    const input: FakeConvInput[] = convs.map((c) => ({
      id: c.conversationId,
      name: c.fullName,
      nameResolved: c.nameResolved,
      customerMsgCount: c.customerMsgCount,
      pageReplied: c.pageReplied,
      repliedAfterPage: c.repliedAfterPage,
      customerChars: c.customerChars,
      customerText: c.customerText,
      hasPhone: !!c.phone,
      firstMsgMs: Date.parse(c.firstMsgTime),
    }));
    const report = analyzeFakeLeads(input);
    return NextResponse.json({ connected: true, pageId: cfg.pageId, report });
  } catch (e) {
    return NextResponse.json(
      { connected: true, error: `Không đọc được hội thoại: ${e instanceof Error ? e.message : e}. Cần quyền pages_messaging + đã “Làm mới token trang”.` },
      { status: 200 },
    );
  }
}
