import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy init: connect только при первом use, чтобы next build не падал при отсутствии DATABASE_URL
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not set in production");
    }
    // build-time / тесты — фейковая строка
    return drizzle(postgres("postgres://placeholder@localhost:5432/placeholder", { prepare: false, max: 1 }), { schema });
  }
  const client = postgres(url, { prepare: false, max: 1 });
  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export type DB = ReturnType<typeof getDb>;
export * from "./schema";
