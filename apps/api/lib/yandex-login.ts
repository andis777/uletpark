import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import type { YandexProfile } from "./yandex";
import { linkBookingsToUserByPhone } from "./sync-amocrm";
import { normalizePhone } from "./auth";

/**
 * Находит или создаёт пользователя по профилю Яндекс ID.
 * Используется и мобильным приложением, и веб-кабинетом — логика одна.
 *
 * Порядок поиска:
 *   1) по yandex_id — он уже привязан;
 *   2) по e-mail — привязываем Яндекс к существующему аккаунту.
 *      Это безопасно: Яндекс сам подтверждает почту, так что владелец тот же;
 *   3) иначе создаём нового.
 *
 * Телефон из Яндекса берём, только если он свободен: номер уникален, и молча
 * забирать его у другого аккаунта нельзя.
 */
export async function loginWithYandexProfile(profile: YandexProfile) {
  let isNewUser = false;

  let [user] = await db.select().from(users).where(eq(users.yandexId, profile.id)).limit(1);

  if (!user && profile.email) {
    [user] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
    if (user) {
      [user] = await db
        .update(users)
        .set({
          yandexId: profile.id,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          firstName: user.firstName ?? profile.firstName,
          lastName: user.lastName ?? profile.lastName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();
    }
  }

  if (!user) {
    isNewUser = true;
    const phone = profile.phone ? normalizePhone(profile.phone) : null;
    // Берём телефон, только если он ещё ни за кем не закреплён.
    let phoneToUse: string | null = null;
    if (phone) {
      const [owner] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (!owner) phoneToUse = phone;
    }
    [user] = await db
      .insert(users)
      .values({
        yandexId: profile.id,
        email: profile.email,
        emailVerifiedAt: profile.email ? new Date() : null,
        phone: phoneToUse,
        firstName: profile.firstName,
        lastName: profile.lastName,
        referralCode: `UP${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      })
      .returning();
  }

  // Подтянуть прошлые сделки из amoCRM, если телефон известен.
  let linkedBookings = 0;
  if (user.phone) {
    try {
      const r = await linkBookingsToUserByPhone(user.id, user.phone);
      linkedBookings = r.linked;
    } catch (e) {
      console.error("[yandex-login] linkBookingsToUserByPhone failed:", e);
    }
  }

  return { user, isNewUser, linkedBookings };
}
