import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/project-service";

export const dynamic = "force-dynamic";

const schema = z.object({ message: z.string().min(1).max(1000) });

// POST /api/projects/:id/notes — thêm ghi chú vào nhật ký dự án.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });

  const activity = await logActivity(params.id, "note", parsed.data.message);
  return NextResponse.json(activity, { status: 201 });
}
