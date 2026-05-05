import { NextResponse } from "next/server";

/**
 * OpenAPI 3.1 spec — отдаётся как /api/openapi.
 * Подключается в Swagger UI на /docs.
 */

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Улётная парковка — Mobile Platform API",
    version: "1.0.0",
    description: "Backend API для мобильного приложения, веб-сайта и admin-панели. Auth через SMS OTP + JWT (mobile) или httpOnly cookie session (admin).",
    contact: { email: "ariswebru@gmail.com" },
  },
  servers: [
    { url: "https://api.uletnayaparkovka.ru", description: "Production" },
    { url: "http://127.0.0.1:7982", description: "Local (внутри сервера)" },
  ],
  tags: [
    { name: "Auth", description: "SMS OTP + JWT для мобильного приложения" },
    { name: "Me", description: "Профиль авторизованного клиента" },
    { name: "Bookings", description: "Брони парковки" },
    { name: "Calc", description: "Калькулятор стоимости (без авторизации)" },
    { name: "Loyalty", description: "Программа лояльности и рефералы" },
    { name: "Events", description: "Аналитика — приём событий с web и mobile" },
    { name: "Webhooks", description: "Входящие webhook от amoCRM" },
    { name: "Admin Auth", description: "Email/password сессия для админа" },
    { name: "Admin", description: "Управление через cookie-сессию" },
    { name: "Cron", description: "Cron-эндпоинты (защищены CRON_SECRET)" },
    { name: "Health", description: "Status check" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Mobile JWT — выдаётся /api/auth/verify-otp в поле accessToken",
      },
      cookieAuth: { type: "apiKey", in: "cookie", name: "admin_session" },
      cronAuth: {
        type: "http",
        scheme: "bearer",
        description: "CRON_SECRET — Authorization: Bearer $CRON_SECRET",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string", example: "INVALID_BODY" },
          message: { type: "string" },
          issues: { type: "array", items: { type: "object" } },
        },
      },
      AuthTokens: {
        type: "object",
        required: ["accessToken", "refreshToken", "expiresIn", "user"],
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          expiresIn: { type: "integer", example: 2592000 },
          isNewUser: { type: "boolean" },
          linkedBookings: { type: "integer", example: 3 },
          user: { $ref: "#/components/schemas/UserProfile" },
        },
      },
      UserProfile: {
        type: "object",
        required: ["id", "phone"],
        properties: {
          id: { type: "string", format: "uuid" },
          phone: { type: "string", example: "+79991234567" },
          firstName: { type: "string", nullable: true },
          lastName: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          loyaltyTier: { type: "string", enum: ["bronze", "silver", "gold"] },
          loyaltyPoints: { type: "integer" },
          referralCode: { type: "string", nullable: true },
        },
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          airport: { type: "string", enum: ["SVO", "DME", "VKO"] },
          dateFrom: { type: "string", format: "date-time" },
          dateTo: { type: "string", format: "date-time" },
          priceRub: { type: "integer" },
          status: { type: "string", enum: ["new", "confirmed", "active", "completed", "cancelled"] },
          carNumber: { type: "string", nullable: true },
          carModel: { type: "string", nullable: true },
          loyaltyPointsEarned: { type: "integer" },
          loyaltyPointsUsed: { type: "integer" },
          source: { type: "string", enum: ["app", "website", "phone", "amocrm"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CalcRequest: {
        type: "object",
        required: ["airport", "dateFrom", "dateTo"],
        properties: {
          airport: { type: "string", enum: ["SVO", "DME", "VKO"] },
          dateFrom: { type: "string", format: "date-time" },
          dateTo: { type: "string", format: "date-time" },
          promoCode: { type: "string" },
          useLoyaltyPoints: { type: "integer", minimum: 0 },
        },
      },
      CalcResponse: {
        type: "object",
        properties: {
          days: { type: "integer" },
          pricePerDayRub: { type: "integer" },
          totalRub: { type: "integer" },
          discountRub: { type: "integer" },
          loyaltyDiscountRub: { type: "integer" },
          finalRub: { type: "integer" },
          pointsToEarn: { type: "integer" },
        },
      },
      CreateBookingRequest: {
        allOf: [
          { $ref: "#/components/schemas/CalcRequest" },
          {
            type: "object",
            required: ["carNumber"],
            properties: {
              carNumber: { type: "string", minLength: 3, maxLength: 15, example: "А123БВ77" },
              carModel: { type: "string" },
              notes: { type: "string" },
            },
          },
        ],
      },
      LoyaltyStatus: {
        type: "object",
        properties: {
          tier: { type: "string", enum: ["bronze", "silver", "gold"] },
          points: { type: "integer" },
          referralCode: { type: "string", nullable: true },
          referralBonusRub: { type: "integer", example: 500 },
          nextTier: { type: "string", enum: ["silver", "gold"], nullable: true },
          progress: { type: "number", minimum: 0, maximum: 1 },
          remainingToNextTierRub: { type: "integer" },
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                delta: { type: "integer" },
                reason: { type: "string" },
                bookingId: { type: "string", nullable: true },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
      EventPayload: {
        type: "object",
        required: ["eventName", "source"],
        properties: {
          eventName: { type: "string", example: "page_view" },
          sessionId: { type: "string" },
          source: { type: "string", enum: ["web", "ios", "android"] },
          url: { type: "string" },
          properties: { type: "object", additionalProperties: true },
          deviceInfo: { type: "object", additionalProperties: true },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    ts: { type: "string", format: "date-time" },
                    db: { type: "string", enum: ["up", "down"] },
                    amocrm: { type: "string", enum: ["stub", "live"] },
                    domain: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/request-otp": {
      post: {
        tags: ["Auth"],
        summary: "Запросить SMS код",
        description: "Rate-limit: 3 запроса / 10 минут на phone, 10 / 10 минут на IP. В DEV возвращает devCode в response.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone"],
                properties: { phone: { type: "string", example: "+79991234567" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Код отправлен",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    expiresIn: { type: "integer" },
                    devCode: { type: "string", description: "Только в DEV" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid phone format", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          429: { description: "Rate limit", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          502: { description: "SMS provider недоступен", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Подтвердить код, получить JWT + auto-link заказов из amoCRM",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone", "code"],
                properties: {
                  phone: { type: "string", example: "+79991234567" },
                  code: { type: "string", example: "123456", minLength: 6, maxLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "JWT + связанные брони", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokens" } } } },
          401: { description: "INVALID_CODE / OTP_NOT_FOUND_OR_EXPIRED" },
          429: { description: "TOO_MANY_ATTEMPTS" },
        },
      },
    },
    "/api/me": {
      get: {
        tags: ["Me"],
        summary: "Профиль",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/UserProfile" } } } } },
          },
          401: { description: "UNAUTHORIZED" },
        },
      },
      patch: {
        tags: ["Me"],
        summary: "Изменить профиль",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string", format: "email" },
                  pushToken: { type: "string", description: "Expo Push Token" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "OK" }, 401: { description: "UNAUTHORIZED" } },
      },
    },
    "/api/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "Список своих броней",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "До 50 последних",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { bookings: { type: "array", items: { $ref: "#/components/schemas/Booking" } } },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Bookings"],
        summary: "Создать бронь (создаст лид в amoCRM)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBookingRequest" } } },
        },
        responses: { 200: { description: "OK" }, 401: { description: "UNAUTHORIZED" } },
      },
    },
    "/api/bookings/{id}": {
      get: {
        tags: ["Bookings"],
        summary: "Детали брони",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "OK" }, 404: { description: "NOT_FOUND" } },
      },
    },
    "/api/bookings/{id}/cancel": {
      post: {
        tags: ["Bookings"],
        summary: "Отменить бронь",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "OK" }, 409: { description: "ALREADY_CLOSED" } },
      },
    },
    "/api/calc": {
      post: {
        tags: ["Calc"],
        summary: "Расчёт стоимости (без авторизации)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CalcRequest" } } } },
        responses: {
          200: { description: "Расчёт", content: { "application/json": { schema: { $ref: "#/components/schemas/CalcResponse" } } } },
        },
      },
    },
    "/api/loyalty": {
      get: {
        tags: ["Loyalty"],
        summary: "Тариф, баллы, прогресс, последние транзакции",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/LoyaltyStatus" } } } } },
      },
    },
    "/api/loyalty/apply-referral": {
      post: {
        tags: ["Loyalty"],
        summary: "Применить чужой реферальный код (+500 ₽)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["code"], properties: { code: { type: "string", minLength: 4, maxLength: 16 } } } } },
        },
        responses: {
          200: { description: "OK" },
          400: { description: "CODE_NOT_FOUND / ALREADY_USED / SELF_REFERRAL" },
        },
      },
    },
    "/api/events": {
      post: {
        tags: ["Events"],
        summary: "Записать событие(я) аналитики",
        description: "Auth опциональна. Принимает одно событие или массив до 100. IP анонимизируется (.x.x.x.0). CORS открытый.",
        security: [{ bearerAuth: [] }, {}],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/EventPayload" },
                  { type: "array", items: { $ref: "#/components/schemas/EventPayload" }, maxItems: 100 },
                ],
              },
            },
          },
        },
        responses: { 200: { description: "OK" }, 400: { description: "INVALID_BODY" } },
      },
    },
    "/api/events/session": {
      get: {
        tags: ["Events"],
        summary: "Агрегация сессий за 30 дней",
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/webhooks/amocrm": {
      post: {
        tags: ["Webhooks"],
        summary: "Webhook от amoCRM (auto-award + tier sync)",
        description: "Принимает x-www-form-urlencoded или JSON. Делает upsert в bookings + автоначисление лояльности при status=completed.",
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/admin/auth/login": {
      post: {
        tags: ["Admin Auth"],
        summary: "Вход админа (cookie сессия)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } },
        },
        responses: { 200: { description: "Set-Cookie: admin_session" }, 401: { description: "INVALID_CREDENTIALS" } },
      },
    },
    "/api/admin/auth/logout": {
      post: {
        tags: ["Admin Auth"],
        summary: "Выход",
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/admin/bookings": {
      get: {
        tags: ["Admin"],
        summary: "Список заказов с фильтрами",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Поиск по телефону/имени/гос.номеру" },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "airport", in: "query", schema: { type: "string", enum: ["SVO", "DME", "VKO"] } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", maximum: 100 } },
        ],
        responses: { 200: { description: "OK" } },
      },
      patch: {
        tags: ["Admin"],
        summary: "Изменить заказ (ручная коррекция)",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/admin/users/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Профиль клиента + история",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "OK" } },
      },
      patch: {
        tags: ["Admin"],
        summary: "Изменить (имя, email, тир)",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/admin/loyalty-rules": {
      get: { tags: ["Admin"], summary: "Список правил лояльности", security: [{ cookieAuth: [] }], responses: { 200: { description: "OK" } } },
      post: { tags: ["Admin"], summary: "Создать правило", security: [{ cookieAuth: [] }], responses: { 200: { description: "OK" } } },
      patch: { tags: ["Admin"], summary: "Изменить правило", security: [{ cookieAuth: [] }], responses: { 200: { description: "OK" } } },
    },
    "/api/admin/loyalty-adjust": {
      post: {
        tags: ["Admin"],
        summary: "Ручная корректировка баллов клиента",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["userId", "delta"], properties: { userId: { type: "string", format: "uuid" }, delta: { type: "integer", description: "+/-" }, reason: { type: "string" } } } } },
        },
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/admin/sync": {
      post: {
        tags: ["Admin"],
        summary: "Запустить синк с amoCRM",
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { pipelineName: { type: "string", default: "Улётная парковка" }, sinceDays: { type: "integer", default: 30, description: "0 = всё" } } } } },
        },
        responses: { 200: { description: "Результат + история" } },
      },
      get: { tags: ["Admin"], summary: "История синков", security: [{ cookieAuth: [] }], responses: { 200: { description: "OK" } } },
    },
    "/api/admin/export/bookings": {
      get: {
        tags: ["Admin"],
        summary: "Экспорт броней в CSV (UTF-8 BOM, открывается в Excel)",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "airport", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "CSV", content: { "text/csv": {} } } },
      },
    },
    "/api/admin/analytics": {
      get: { tags: ["Admin"], summary: "JSON-данные для дашборда", security: [{ cookieAuth: [] }], responses: { 200: { description: "OK" } } },
    },
    "/api/cron/refresh-analytics": {
      get: {
        tags: ["Cron"],
        summary: "Refresh materialized views",
        security: [{ cronAuth: [] }],
        responses: { 200: { description: "OK" }, 403: { description: "FORBIDDEN" } },
      },
    },
    "/api/cron/sync-amocrm": {
      post: {
        tags: ["Cron"],
        summary: "Periodic incremental sync",
        security: [{ cronAuth: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { pipelineName: { type: "string" }, sinceDays: { type: "integer", default: 1 } } } } } },
        responses: { 200: { description: "OK" }, 403: { description: "FORBIDDEN" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
