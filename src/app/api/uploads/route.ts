import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Upload asset mới cho Planner. Ghi vào public/uploads (mount volume) → Next phục vụ
// tại /uploads/<file> → Facebook fetch qua URL công khai khi đăng/lên lịch.

const MAX_BYTES = 60 * 1024 * 1024; // 60MB
const ALLOWED = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime))$/;
const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
};

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file." }, { status: 400 });
  }
  if (!ALLOWED.test(file.type)) {
    return NextResponse.json({ error: `Định dạng không hỗ trợ: ${file.type || "?"}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File quá lớn (tối đa 60MB)." }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}${EXT[file.type] || ".bin"}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const origin = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");
  return NextResponse.json({
    url: `${origin}/uploads/${filename}`,
    mediaType: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
  });
}
