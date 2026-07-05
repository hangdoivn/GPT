import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensurePage } from "@/lib/sync";
import { isConnected, resolveConfig } from "@/lib/facebook/auth";
import { publishPost } from "@/lib/facebook/pages";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json(posts);
}

const schema = z.object({
  content: z.string().min(1, "Nội dung không được rỗng"),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  scheduledAt: z.string().datetime().optional(),
  publishNow: z.boolean().optional(),
});

// POST /api/posts — tạo bài nháp, lên lịch, hoặc đăng ngay
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { content, mediaUrl, scheduledAt, publishNow } = parsed.data;
  const pageId = await ensurePage();

  let status = "draft";
  let fbPostId: string | undefined;
  let publishedAt: Date | undefined;

  if ((publishNow || scheduledAt) && (await isConnected())) {
    try {
      const cfg = await resolveConfig();
      const scheduledUnix = scheduledAt ? Math.floor(new Date(scheduledAt).getTime() / 1000) : undefined;
      const res = await publishPost(cfg, content, scheduledUnix);
      fbPostId = res.id;
      status = scheduledAt ? "scheduled" : "published";
      if (!scheduledAt) publishedAt = new Date();
    } catch (e) {
      return NextResponse.json(
        { error: `Không đăng được lên Facebook: ${e instanceof Error ? e.message : e}` },
        { status: 502 },
      );
    }
  } else if (scheduledAt) {
    status = "scheduled";
  }

  const post = await prisma.post.create({
    data: {
      pageId,
      content,
      mediaUrl: mediaUrl || null,
      status,
      fbPostId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      publishedAt: publishedAt ?? null,
    },
  });
  return NextResponse.json(post, { status: 201 });
}
