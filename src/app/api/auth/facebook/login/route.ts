import { NextRequest, NextResponse } from "next/server";
import { buildLoginUrl, hasAppCredentials } from "@/lib/facebook/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/facebook/login — bắt đầu luồng OAuth
export function GET(req: NextRequest) {
  if (!hasAppCredentials()) {
    return NextResponse.redirect(new URL("/settings?error=no_app_creds", req.nextUrl.origin));
  }

  const origin = process.env.APP_URL || req.nextUrl.origin;
  // state chống CSRF — lưu vào cookie httpOnly, kiểm ở callback.
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(buildLoginUrl(origin, state));
  res.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
