import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* =========================================================================
 * Enums
 * ======================================================================= */

export const loyaltyTierEnum = pgEnum("loyalty_tier", ["bronze", "silver", "gold"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "new",
  "confirmed",
  "active",
  "completed",
  "cancelled",
]);
export const airportEnum = pgEnum("airport", ["SVO", "DME", "VKO"]);
export const eventSourceEnum = pgEnum("event_source", ["web", "ios", "android", "admin"]);
export const bookingSourceEnum = pgEnum("booking_source", ["app", "website", "phone", "amocrm"]);

/* =========================================================================
 * users — клиенты mobile app
 * ======================================================================= */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Телефон больше НЕ обязателен: можно зарегистрироваться по почте.
    // Телефон запрашивается при первой брони (нужен для amoCRM и трансфера).
    phone: text("phone"),                                    // +79991234567
    amocrmContactId: bigint("amocrm_contact_id", { mode: "number" }),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    // Яндекс ID: вход в один тап, без ввода кода. Хранится id пользователя Яндекса.
    yandexId: text("yandex_id"),
    loyaltyTier: loyaltyTierEnum("loyalty_tier").default("bronze").notNull(),
    loyaltyPoints: integer("loyalty_points").default(0).notNull(),
    referralCode: text("referral_code"),
    referredBy: uuid("referred_by"),
    pushToken: text("push_token"),                           // Expo Push Token
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    phoneIdx: uniqueIndex("users_phone_idx").on(t.phone),
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    yandexIdx: uniqueIndex("users_yandex_idx").on(t.yandexId),
    amocrmIdx: uniqueIndex("users_amocrm_idx").on(t.amocrmContactId),
    referralIdx: uniqueIndex("users_referral_idx").on(t.referralCode),
  })
);

/* =========================================================================
 * otp_codes — одноразовые коды для SMS-логина
 * ======================================================================= */

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Старое поле: остаётся ради обратной совместимости со /auth/request-otp.
    // Для входа по почте телефона нет — поэтому больше не NOT NULL.
    phone: text("phone"),
    // Новое: универсальный идентификатор — нормализованный телефон ИЛИ e-mail в нижнем регистре.
    identifier: text("identifier"),
    channel: text("channel").default("sms").notNull(),       // sms | email
    codeHash: text("code_hash").notNull(),                   // bcrypt hash
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    phoneIdx: index("otp_phone_idx").on(t.phone, t.expiresAt),
    identIdx: index("otp_identifier_idx").on(t.identifier, t.expiresAt),
  })
);

/* =========================================================================
 * bookings — зеркало сделок amoCRM + own metadata
 * ======================================================================= */

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    amocrmLeadId: bigint("amocrm_lead_id", { mode: "number" }),
    userId: uuid("user_id").references(() => users.id),
    airport: airportEnum("airport").notNull(),
    dateFrom: timestamp("date_from", { withTimezone: true }).notNull(),
    dateTo: timestamp("date_to", { withTimezone: true }).notNull(),
    priceKopecks: integer("price_kopecks").notNull(),        // 15000 = 150₽
    status: bookingStatusEnum("status").default("new").notNull(),
    carNumber: text("car_number"),
    carModel: text("car_model"),
    loyaltyPointsEarned: integer("loyalty_points_earned").default(0).notNull(),
    loyaltyPointsUsed: integer("loyalty_points_used").default(0).notNull(),
    source: bookingSourceEnum("source").default("app").notNull(),
    rawAmocrm: jsonb("raw_amocrm"),                          // полная копия для отладки
    notes: text("notes"),
    name: text("name"),                                      // имя из заявки (веб/app) — для показа в админке, в т.ч. без userId
    phone: text("phone"),                                    // телефон из заявки (анонимные лиды без user)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    amocrmIdx: uniqueIndex("bookings_amocrm_idx").on(t.amocrmLeadId),
    userIdx: index("bookings_user_idx").on(t.userId, t.dateFrom),
    statusIdx: index("bookings_status_idx").on(t.status, t.dateFrom),
  })
);

/* =========================================================================
 * loyalty_transactions — audit log начислений и списаний
 * ======================================================================= */

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    deltaPoints: integer("delta_points").notNull(),          // +/-
    reason: text("reason").notNull(),                        // 'booking_completed', 'referral_bonus', 'redeem', 'manual_adjust'
    bookingId: uuid("booking_id").references(() => bookings.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("loyalty_tx_user_idx").on(t.userId, t.createdAt),
  })
);

/* =========================================================================
 * loyalty_rules — управляются из админки
 * ======================================================================= */

/* =========================================================================
 * services — каталог допуслуг на парковке
 *
 * price_kopecks НЕ обязателен: пока владелец не подтвердил цену, показываем
 * «цену уточнит менеджер». Так каталог живёт на сайте, ничего не обещая
 * клиенту заранее. is_active выключает услугу, не удаляя её.
 * ======================================================================= */

export const serviceCategoryEnum = pgEnum("service_category", [
  "care",     // мойка, уборка, детейлинг
  "tech",     // шиномонтаж, масло, АКБ, подкачка
  "winter",   // прогрев, очистка от снега
  "comfort",  // детское кресло, встреча, багаж
  "partner",  // страховка, аренда авто, отель — через партнёров
]);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    category: serviceCategoryEnum("category").notNull(),
    priceKopecks: integer("price_kopecks"),                  // null → «цена по запросу»
    unit: text("unit"),                                      // «за колесо», «за сутки», «разово»
    isActive: boolean("is_active").default(false).notNull(), // включает владелец
    sortOrder: integer("sort_order").default(100).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("services_slug_idx").on(t.slug),
    activeIdx: index("services_active_idx").on(t.isActive, t.sortOrder),
  })
);

/* =========================================================================
 * service_requests — заявка клиента на услугу
 *
 * Не заказ и не оплата: менеджер подтверждает и называет цену, как и с бронью.
 * ======================================================================= */

export const serviceRequestStatusEnum = pgEnum("service_request_status", [
  "new",
  "confirmed",
  "done",
  "declined",
]);

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id),
    serviceId: uuid("service_id").references(() => services.id).notNull(),
    status: serviceRequestStatusEnum("status").default("new").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("service_req_user_idx").on(t.userId, t.createdAt),
    statusIdx: index("service_req_status_idx").on(t.status, t.createdAt),
  })
);

/* =========================================================================
 * partner_applications — заявки парковок из других аэропортов
 *
 * ВАЖНО: Шереметьево исключено намеренно — это наш аэропорт, подключать там
 * чужие площадки значит кормить собственных конкурентов.
 * ======================================================================= */

export const partnerApplications = pgTable(
  "partner_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    company: text("company"),
    contactName: text("contact_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    city: text("city").notNull(),
    airport: text("airport").notNull(),                      // свободный текст: аэропортов много
    spaces: integer("spaces"),                               // мест на площадке
    hasTransfer: boolean("has_transfer"),
    message: text("message"),
    status: text("status").default("new").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("partner_app_status_idx").on(t.status, t.createdAt),
  })
);

export const loyaltyRules = pgTable("loyalty_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),                              // 'cashback_pct', 'tier_threshold', 'referral_bonus'
  config: jsonb("config").notNull().$type<Record<string, unknown>>(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* =========================================================================
 * events — своя метрика (web + app)
 * ======================================================================= */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    sessionId: text("session_id"),
    eventName: text("event_name").notNull(),                 // 'page_view', 'app_open', 'calc_started', 'booking_created'
    source: eventSourceEnum("source").notNull(),
    url: text("url"),
    properties: jsonb("properties"),
    deviceInfo: jsonb("device_info"),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index("events_name_ts_idx").on(t.eventName, t.ts),
    userIdx: index("events_user_ts_idx").on(t.userId, t.ts),
    sessionIdx: index("events_session_idx").on(t.sessionId),
  })
);

/* =========================================================================
 * admins — доступ в admin panel
 * ======================================================================= */

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),                     // optional, если SSO — null
    role: text("role").notNull(),                            // 'owner', 'manager', 'analyst'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("admins_email_idx").on(t.email),
  })
);

/* =========================================================================
 * sync_runs — история запусков синхронизации с amoCRM
 * ======================================================================= */

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),                    // 'manual', 'cron', 'backfill', 'webhook'
  status: text("status").notNull(),                // 'running', 'success', 'error'
  pipelineId: integer("pipeline_id"),
  fetched: integer("fetched").default(0).notNull(),
  inserted: integer("inserted").default(0).notNull(),
  updated: integer("updated").default(0).notNull(),
  linkedToUsers: integer("linked_to_users").default(0).notNull(),
  skipped: integer("skipped").default(0).notNull(),
  errors: jsonb("errors"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  triggeredBy: text("triggered_by"),               // admin email или 'cron'
});

/**
 * Аудит-лог админских действий.
 * Кто, когда, что сделал. Для безопасности и расследований.
 */
export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id"),               // null если не залогинен (попытка)
  adminEmail: text("admin_email"),
  action: text("action").notNull(),        // 'login', 'logout', 'update_booking', 'adjust_loyalty', ...
  resource: text("resource"),              // 'booking:123', 'user:abc'
  payload: jsonb("payload"),               // что изменено / параметры
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  adminIdx: index("audit_admin_idx").on(t.adminId),
  actionIdx: index("audit_action_idx").on(t.action),
  createdIdx: index("audit_created_idx").on(t.createdAt),
}));

/* =========================================================================
 * Relations
 * ======================================================================= */

export const usersRelations = relations(users, ({ many, one }) => ({
  bookings: many(bookings),
  loyaltyTransactions: many(loyaltyTransactions),
  referrer: one(users, { fields: [users.referredBy], references: [users.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  loyaltyTx: many(loyaltyTransactions),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  user: one(users, { fields: [loyaltyTransactions.userId], references: [users.id] }),
  booking: one(bookings, { fields: [loyaltyTransactions.bookingId], references: [bookings.id] }),
}));

/* =========================================================================
 * Type exports
 * ======================================================================= */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type LoyaltyTx = typeof loyaltyTransactions.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Service = typeof services.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type PartnerApplication = typeof partnerApplications.$inferSelect;
