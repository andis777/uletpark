-- Допуслуги на парковке + партнёрская программа для площадок в других аэропортах.
-- Идемпотентно и в транзакции: можно гонять повторно.
--
-- Каталог собран по разбору конкурентов: The Parking Spot / AirPark / FreedomPark (США),
-- Holiday Extras / Purple Parking (Великобритания), Skypoint и Park&Fly (Шереметьево).
-- Цены НЕ проставлены намеренно — владелец подтверждает их отдельно, до тех пор
-- клиент видит «цену уточнит менеджер». is_active = false у всех: ничего не появится
-- на сайте, пока владелец не включит.

BEGIN;

DO $$ BEGIN
  CREATE TYPE service_category AS ENUM ('care','tech','winter','comfort','partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE service_request_status AS ENUM ('new','confirmed','done','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  title         text NOT NULL,
  description   text,
  category      service_category NOT NULL,
  price_kopecks integer,
  unit          text,
  is_active     boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS services_slug_idx   ON services (slug);
CREATE INDEX        IF NOT EXISTS services_active_idx ON services (is_active, sort_order);

CREATE TABLE IF NOT EXISTS service_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  booking_id  uuid REFERENCES bookings(id),
  service_id  uuid NOT NULL REFERENCES services(id),
  status      service_request_status NOT NULL DEFAULT 'new',
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_req_user_idx   ON service_requests (user_id, created_at);
CREATE INDEX IF NOT EXISTS service_req_status_idx ON service_requests (status, created_at);

CREATE TABLE IF NOT EXISTS partner_applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company      text,
  contact_name text NOT NULL,
  phone        text NOT NULL,
  email        text,
  city         text NOT NULL,
  airport      text NOT NULL,
  spaces       integer,
  has_transfer boolean,
  message      text,
  status       text NOT NULL DEFAULT 'new',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_app_status_idx ON partner_applications (status, created_at);

-- Каталог. ON CONFLICT DO NOTHING — повторный прогон не затрёт цены и флаги,
-- которые владелец уже выставил руками.
INSERT INTO services (slug, title, description, category, unit, sort_order) VALUES
  -- Уход за автомобилем. Самая ходовая допуслуга в мире; у соседнего Skypoint
  -- открытый прайс, так что спрос под Шереметьево подтверждён.
  ('wash-body',      'Мойка кузова к прилёту',        'Вернётесь к чистой машине — помоем, пока вы в отъезде.', 'care',    'разово', 10),
  ('wash-interior',  'Уборка салона',                 'Пылесос, стёкла изнутри, протирка пластика.',            'care',    'разово', 20),
  ('wash-pet-hair',  'Удаление шерсти животных',      'Салон и багажник после поездок с питомцем.',             'care',    'разово', 30),
  ('detailing',      'Детейлинг и полировка',         'Глубокая химчистка, воск, обработка кожи.',              'care',    'разово', 40),

  -- Техника. Персонал на площадке круглосуточно — часть делается на месте.
  ('tire-pressure',  'Подкачка шин',                  'Проверим и подкачаем перед выдачей.',                    'tech',    'за колесо', 50),
  ('battery-jump',   'Прикуривание и подзарядка АКБ', 'Аккумулятор сел за время поездки — заведём.',            'tech',    'разово', 60),
  ('tire-change',    'Шиномонтаж со сменой сезона',   'Машина всё равно стоит две недели — переобуем к возвращению.', 'tech', 'комплект', 70),
  ('tire-storage',   'Хранение комплекта шин',        'Снятый комплект остаётся у нас до следующего сезона.',   'tech',    'за сезон', 80),
  ('oil-change',     'Замена масла и мелкое ТО',      'Сделаем, пока вы в отпуске, — не тратя ваш выходной.',   'tech',    'разово', 90),
  ('ev-charge',      'Зарядка электромобиля',         'Вернётесь к заряженной батарее.',                        'tech',    'разово', 100),

  -- Зима. Ровно то, чего нет у западных сервисов, и то, что реально болит в Москве.
  ('winter-warmup',  'Прогрев к прилёту',             'К вашему рейсу машина заведена и прогрета.',             'winter',  'разово', 110),
  ('winter-snow',    'Очистка от снега и льда',       'Не придётся откапывать машину после ночного рейса.',     'winter',  'разово', 120),

  -- Комфорт вокруг трансфера. Стоит почти ничего, а в отзывах отражается сразу.
  ('child-seat',     'Детское кресло в трансфер',     'Скажите возраст ребёнка — подготовим кресло.',           'comfort', 'разово', 130),
  ('luggage-wrap',   'Упаковка багажа',               'Плёнка на чемоданы прямо на площадке.',                  'comfort', 'за место', 140),
  ('meet-luggage',   'Встреча и помощь с багажом',    'Водитель встретит у выхода и поможет с чемоданами.',     'comfort', 'разово', 150)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
