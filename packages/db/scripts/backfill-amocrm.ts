/**
 * Backfill: разовый импорт ВСЕХ сделок из воронки «Улётная парковка» в нашу БД.
 *
 * Запуск:
 *   pnpm --filter @uletnaya/db tsx scripts/backfill-amocrm.ts
 *
 * Предусловия:
 *   - В .env заданы AMOCRM_DOMAIN, AMOCRM_CLIENT_ID, AMOCRM_CLIENT_SECRET, AMOCRM_REFRESH_TOKEN
 *   - DATABASE_URL указывает на боевую БД (или dev — для теста на staging)
 *
 * Поведение:
 *   - Идёт постранично через amoCRM API (250 шт/страницу)
 *   - Upsert по amocrm_lead_id (повторный запуск безопасен)
 *   - Привязывает к users по совпадению телефона контакта
 *   - Логирует прогресс каждые 100 сделок
 *
 * Фильтрация по воронке:
 *   - По умолчанию ищет воронку с подстрокой "Улётная парковка" (case-insensitive, ё↔е)
 *   - Можно переопределить через PIPELINE=CustomName
 */

import { syncFromPipeline } from "../../apps/api/lib/sync-amocrm.js";

const PIPELINE = process.env.PIPELINE ?? "Улётная парковка";
const SINCE = process.env.SINCE ? new Date(process.env.SINCE) : undefined;

async function main() {
  console.log(`→ Backfill из воронки "${PIPELINE}"${SINCE ? ` updated_after ${SINCE.toISOString()}` : " (всё)"}...`);
  const t0 = Date.now();

  const result = await syncFromPipeline({
    pipelineName: PIPELINE,
    updatedAfter: SINCE,
  });

  const ms = Date.now() - t0;
  console.log(`\n=== Результат за ${(ms / 1000).toFixed(1)}с ===`);
  console.log(`Pipeline ID:   ${result.pipelineId ?? "не найден"}`);
  console.log(`Fetched:       ${result.fetched}`);
  console.log(`Inserted:      ${result.inserted}`);
  console.log(`Updated:       ${result.updated}`);
  console.log(`Linked → user: ${result.linkedToUsers}`);
  console.log(`Skipped:       ${result.skipped}`);

  if (result.errors.length > 0) {
    console.log(`\n=== Ошибки (${result.errors.length}) ===`);
    for (const e of result.errors.slice(0, 10)) console.log(`  ${e}`);
    if (result.errors.length > 10) console.log(`  ...ещё ${result.errors.length - 10}`);
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
