import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phục vụ asset upload từ volume (public/uploads). Next start KHÔNG serve file thêm
// vào public/ lúc runtime, nên tự đọc & stream ở đây. URL công khai: /media/<uuid>.<ext>.

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

export async function GET(_req: NextRequest, { params }: { params: { file: string } }) {
  const file = params.file;
  // chống path traversal: chỉ nhận uuid.ext
  if (!/^[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "uploads", file));
    const ext = path.extname(file).toLowerCase();
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
