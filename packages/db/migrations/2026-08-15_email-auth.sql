-- ============================================================================
-- Этап 1: вход по коду на e-mail (вместо/вместе с SMS)
-- Применяется один раз:  psql "$DATABASE_URL" -f 2026-08-15_email-auth.sql
-- Идемпотентна: повторный запуск ничего не сломает.
-- ============================================================================

BEGIN;

-- 1) Телефон больше не обязателен: регистрация возможна по почте.
--    Телефон спрашиваем при первой брони (нужен для amoCRM/трансфера).
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- 2) Почта становится вторым логином → нужна уникальность.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

--    Приводим существующие адреса к нижнему регистру, чтобы уникальный
--    индекс не упал на дублях вида Ivan@mail.ru / ivan@mail.ru.
UPDATE users SET email = lower(trim(email)) WHERE email IS NOT NULL;

--    Если в базе уже есть дубли почты — оставляем её только у самой старой
--    записи, у остальных чистим (иначе уникальный индекс не создастся).
WITH dupes AS (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at) AS rn
  FROM users
  WHERE email IS NOT NULL AND email <> ''
)
UPDATE users u SET email = NULL
FROM dupes d
WHERE u.id = d.id AND d.rn > 1;

--    Пустые строки → NULL (иначе '' считается значением и ломает уникальность).
UPDATE users SET email = NULL WHERE email = '';

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- 3) Коды логина: обобщаем с «только SMS» на любой канал.
ALTER TABLE otp_codes ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS identifier text;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'sms';

--    Бэкфилл: у старых записей идентификатор = телефон.
UPDATE otp_codes SET identifier = phone WHERE identifier IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS otp_identifier_idx ON otp_codes (identifier, expires_at);

COMMIT;

-- Проверка после применения:
--   SELECT is_nullable FROM information_schema.columns
--    WHERE table_name='users' AND column_name='phone';               -- ожидаем YES
--   SELECT indexname FROM pg_indexes WHERE tablename='users';        -- ожидаем users_email_idx
--   SELECT channel, count(*) FROM otp_codes GROUP BY channel;
