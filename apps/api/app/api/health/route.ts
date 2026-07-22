import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { amocrmInfo } from "@/lib/amocrm";

export async function GET() {
  let dbStatus: "up" | "down" = "down";
  try {
    await db.execute(sql`select 1`);
    dbStatus = "up";
  } catch { /* down */ }

  return NextResponse.json({
    ok: dbStatus === "up",
    ts: new Date().toISOString(),
    db: dbStatus,
    amocrm: amocrmInfo.isStub ? "stub" : "live",
    domain: amocrmInfo.domain || null,
    // Коммит собранного образа (ARG APP_COMMIT в Dockerfile).
    // По нему smoke-тест в CI проверяет, что выкатили именно этот код.
    commit: process.env.APP_COMMIT || "unknown",
  });
}
