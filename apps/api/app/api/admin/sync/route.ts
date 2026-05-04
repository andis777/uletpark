import { NextResponse } from "next/server";
import { z } from "zod";
import { sql, desc } from "drizzle-orm";
import { db, syncRuns } from "@/lib/db";
import { syncFromPipeline, linkOrphanBookings } from "@/lib/sync-amocrm";
import { getAdminFromCookie } from "@/lib/admin-auth";

const Body = z.object({
  pipelineName: z.string().default("Улётная парковка"),
  sinceDays: z.number().int().min(0).max(3650).optional(),     // 0 = всё, omit = только последние 30 дней
});

export async function POST(req: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const sinceDays = body.data.sinceDays ?? 30;
  const updatedAfter = sinceDays > 0 ? new Date(Date.now() - sinceDays * 86_400_000) : undefined;

  // Создаём запись о запуске
  const [run] = await db.insert(syncRuns).values({
    kind: "manual",
    status: "running",
    triggeredBy: admin.email,
  }).returning();

  try {
    const result = await syncFromPipeline({ pipelineName: body.data.pipelineName, updatedAfter });
    const orphans = await linkOrphanBookings();

    await db.update(syncRuns).set({
      status: "success",
      pipelineId: result.pipelineId,
      fetched: result.fetched,
      inserted: result.inserted,
      updated: result.updated,
      linkedToUsers: result.linkedToUsers + orphans.linked,
      skipped: result.skipped,
      errors: result.errors.length > 0 ? result.errors : null,
      finishedAt: sql`NOW()`,
    }).where(sql`${syncRuns.id} = ${run.id}`);

    return NextResponse.json({
      ok: true,
      runId: run.id,
      result,
      orphans,
    });
  } catch (e) {
    await db.update(syncRuns).set({
      status: "error",
      errors: [(e as Error).message],
      finishedAt: sql`NOW()`,
    }).where(sql`${syncRuns.id} = ${run.id}`);
    return NextResponse.json({ error: "SYNC_FAILED", message: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const admin = await getAdminFromCookie();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const runs = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(30);
  return NextResponse.json({ runs });
}
