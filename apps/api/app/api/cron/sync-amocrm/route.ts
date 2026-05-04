import { NextResponse } from "next/server";
import { z } from "zod";
import { sql, desc } from "drizzle-orm";
import { db, syncRuns } from "@/lib/db";
import { syncFromPipeline, linkOrphanBookings } from "@/lib/sync-amocrm";

/**
 * Cron endpoint для periodic incremental sync с amoCRM.
 * Защита: Authorization: Bearer $CRON_SECRET.
 * Вызывается из docker-compose cron контейнера каждые 15 минут.
 */

const Body = z.object({
  pipelineName: z.string().default("Улётная парковка"),
  sinceDays: z.number().int().min(0).max(3650).default(1),
});

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const updatedAfter = body.data.sinceDays > 0
    ? new Date(Date.now() - body.data.sinceDays * 86_400_000)
    : undefined;

  const [run] = await db.insert(syncRuns).values({
    kind: "cron",
    status: "running",
    triggeredBy: "cron",
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

    return NextResponse.json({ ok: true, runId: run.id, ...result, orphans });
  } catch (e) {
    await db.update(syncRuns).set({
      status: "error",
      errors: [(e as Error).message],
      finishedAt: sql`NOW()`,
    }).where(sql`${syncRuns.id} = ${run.id}`);
    return NextResponse.json({ error: "SYNC_FAILED", message: (e as Error).message }, { status: 500 });
  }
}
