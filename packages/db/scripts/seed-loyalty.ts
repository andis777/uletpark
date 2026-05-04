/**
 * Seed: дефолтные правила лояльности.
 * Запуск: pnpm --filter @uletnaya/db tsx scripts/seed-loyalty.ts
 */
import { db, loyaltyRules } from "../index.js";
import { eq } from "drizzle-orm";

const DEFAULTS = [
  { name: "Cashback 5%", type: "cashback_pct", config: { pct: 5 }, active: true },
  { name: "Тир Silver", type: "tier_threshold", config: { tier: "silver", threshold_kopeks: 500_000 }, active: true },
  { name: "Тир Gold",   type: "tier_threshold", config: { tier: "gold",   threshold_kopeks: 2_500_000 }, active: true },
  { name: "Реферальный бонус 500/500", type: "referral_bonus", config: { invited_rub: 500, referrer_rub: 500 }, active: true },
];

async function main() {
  const existing = await db.select().from(loyaltyRules);
  if (existing.length > 0) {
    console.log(`Уже есть ${existing.length} правил, пропускаю seed.`);
    return;
  }
  for (const r of DEFAULTS) {
    const [c] = await db.insert(loyaltyRules).values(r).returning();
    console.log(`✓ ${c.type}: ${c.name}`);
  }
  console.log("\nГотово.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
