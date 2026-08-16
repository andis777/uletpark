import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, services, serviceRequests, bookings } from "@/lib/db";
import { getCurrentClient } from "@/lib/cabinet-auth";
import { notifyServiceRequest } from "@/lib/notify";

export const dynamic = "force-dynamic";

const Body = z.object({
  serviceSlug: z.string().min(1).max(64),
  bookingId: z.string().uuid().optional(),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentClient();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const { serviceSlug, bookingId, comment } = parsed.data;

  // Только включённые услуги: выключенную заказать нельзя, даже зная slug.
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.slug, serviceSlug), eq(services.isActive, true)))
    .limit(1);
  if (!service) return NextResponse.json({ error: "SERVICE_NOT_FOUND" }, { status: 404 });

  // Бронь принимаем только свою — иначе можно привязаться к чужой.
  if (bookingId) {
    const [b] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, user.id)))
      .limit(1);
    if (!b) return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
  }

  const [created] = await db
    .insert(serviceRequests)
    .values({ userId: user.id, serviceId: service.id, bookingId: bookingId ?? null, comment: comment ?? null })
    .returning();

  // Заявка бесполезна, если о ней никто не узнал. Падение уведомления не должно
  // терять саму заявку — она уже в базе.
  notifyServiceRequest({
    service: service.title,
    userName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "—",
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    comment: comment ?? undefined,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: created.id });
}
