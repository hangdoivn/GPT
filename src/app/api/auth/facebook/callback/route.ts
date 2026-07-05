import { NextRequest, NextResponse } from "next/server";
import { completeOAuth } from "@/lib/facebook/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/facebook/callback — Facebook chuyển về sau khi user cấp quyền
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const err = sp.get("error");
  const settings = new URL("/settings", req.nextUrl.origin);

  if (err) {
    settings.searchParams.set("error", err);
    return NextResponse.redirect(settings);
  }

  // Kiểm state chống CSRF.
  const cookieState = req.cookies.get("fb_oauth_state")?.value;
  if (!code || !state || state !== cookieState) {
    settings.searchParams.set("error", "state_mismatch");
    return NextResponse.redirect(settings);
  }

  try {
    const origin = process.env.APP_URL || req.nextUrl.origin;
    const r = await completeOAuth(origin, code);
    settings.searchParams.set("connected", "1");
    settings.searchParams.set("pages", String(r.pages));
    const res = NextResponse.redirect(settings);
    res.cookies.delete("fb_oauth_state");
    return res;
  } catch (e) {
    settings.searchParams.set("error", e instanceof Error ? e.message : "oauth_failed");
    return NextResponse.redirect(settings);
  }
}
