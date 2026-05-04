/**
 * Seed: первый админ для входа в /admin.
 *
 * Запуск:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret pnpm --filter @uletnaya/db tsx scripts/seed-admin.ts
 *
 * Если переменные не заданы — берёт дефолты admin@uletnaya / admin (только для DEV!).
 */

// @ts-expect-error: bcryptjs types resolved at runtime
import bcrypt from "bcryptjs";
import { db, admins } from "../index.js";
import { eq } from "drizzle-orm";

const email = process.env.ADMIN_EMAIL ?? "admin@uletnaya.ru";
const password = process.env.ADMIN_PASSWORD ?? "admin";
const role = process.env.ADMIN_ROLE ?? "owner";

async function main() {
  const existing = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  const hash = await bcrypt.hash(password, 10);

  if (existing.length > 0) {
    await db.update(admins).set({ passwordHash: hash, role }).where(eq(admins.email, email));
    console.log(`✓ Обновлён существующий админ ${email} (role: ${role})`);
  } else {
    await db.insert(admins).values({ email, passwordHash: hash, role });
    console.log(`✓ Создан админ ${email} (role: ${role})`);
  }

  if (password === "admin") {
    console.log("\n⚠️  Используется дефолтный пароль 'admin'. Сразу смени через ADMIN_PASSWORD.");
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
