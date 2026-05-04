import { NextResponse } from "next/server";
import { z } from "zod";
import { db, events } from "@/lib/db";
import { getUserFromHeader } from "@/lib/auth";

const Body = z.object({
  eventName: z.string().min(1).max(64),
  sessionId: z.string().max(64).optional(),
  source: z.enum(["web", "ios", "android"]),
  url: z.string().max(512).optional(),
  properties: z.record(z.unknown()).optional(),
  deviceInfo: z.record(z.unknown()).optional(),
});

const ArrayBody = z.union([Body, z.array(Body).max(100)]);

/* IP-аноним: режем последний октет IPv4 / последние 80 бит IPv6 */
function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 3).concat(["0", "0", "0", "0", "0"]).join(":");
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  parts[3] = "0";
  return parts.join(".");
}

export async function POST(req: Request) {
  // Опционально: пользователь авторизован
  const auth = await getUserFromHeader(req.headers.get("authorization"));

  // CORS — публичный endpoint
  const headers = corsHeaders(req);

  const parsed = ArrayBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400, headers });

  const list = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

  // IP анонимизируем для GDPR / 152-ФЗ
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ipAnon = anonymizeIp(ip);

  const rows = list.map(e => ({
    userId: auth?.sub ?? null,
    sessionId: e.sessionId ?? null,
    eventName: e.eventName,
    source: e.source,
    url: e.url ?? null,
    properties: e.properties ?? null,
    deviceInfo: { ...(e.deviceInfo ?? {}), ip: ipAnon },
  }));

  await db.insert(events).values(rows);
  return NextResponse.json({ ok: true, count: rows.length }, { headers });
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
