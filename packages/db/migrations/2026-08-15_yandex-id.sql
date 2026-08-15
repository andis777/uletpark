-- ============================================================================
-- Этап 2: вход через Яндекс ID
-- Применять ПОСЛЕ 2026-08-15_email-auth.sql:
--   psql "$DATABASE_URL" -f 2026-08-15_yandex-id.sql
-- Идемпотентна.
-- ============================================================================

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS yandex_id text;

-- Один аккаунт Яндекса = один пользователь.
CREATE UNIQUE INDEX IF NOT EXISTS users_yandex_idx ON users (yandex_id);

COMMIT;

-- Проверка:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='users' AND column_name='yandex_id';
--   SELECT indexname FROM pg_indexes WHERE tablename='users' AND indexname='users_yandex_idx';
