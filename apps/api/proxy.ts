// Next.js 16: renamed from middleware.ts → proxy.ts. Default runtime: Node.js.
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@/lib/admin-auth";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "DEV_SECRET_DO_NOT_USE_IN_PROD_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
);

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/auth/login", "/api/admin/auth/logout"];

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key",
  "Access-Control-Max-Age": "86400",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) CORS preflight для всех /api/* — отвечаем сразу 204
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // 2) Защита /admin и /api/admin (кроме публичных login/logout)
  const needsAdmin =
    (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
    !PUBLIC_ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));

  if (!needsAdmin) return NextResponse.next();

  const tok = req.cookies.get(COOKIE_NAME)?.value;
  if (!tok) return redirectOrJson(req);

  try {
    await jwtVerify(tok, SECRET);
    return NextResponse.next();
  } catch {
    return redirectOrJson(req);
  }
}

function redirectOrJson(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: CORS_HEADERS });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

// Matcher: и админ-зона, и весь /api/* (для OPTIONS preflight). Но проверка
// admin-куки срабатывает только для needsAdmin путей.
export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
