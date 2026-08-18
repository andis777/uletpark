-- Запросы клиента на изменение брони из кабинета.
--
-- Почему запрос, а не прямое изменение: цена зависит от срока, а подтверждает её
-- менеджер — так работает весь бизнес. Клиент видит «отправлено», менеджер решает.
-- Номер машины при этом клиент правит сам: это его данные, цену они не меняют.

BEGIN;

DO $$ BEGIN
  CREATE TYPE booking_change_kind AS ENUM ('extend');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_change_status AS ENUM ('new','approved','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS booking_change_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL REFERENCES bookings(id),
  user_id      uuid NOT NULL REFERENCES users(id),
  kind         booking_change_kind NOT NULL,
  new_date_to  timestamptz,
  comment      text,
  status       booking_change_status NOT NULL DEFAULT 'new',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bcr_booking_idx ON booking_change_requests (booking_id, created_at);
CREATE INDEX IF NOT EXISTS bcr_status_idx  ON booking_change_requests (status, created_at);

COMMIT;
