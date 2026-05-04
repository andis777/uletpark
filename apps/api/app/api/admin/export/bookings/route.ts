import { NextResponse } from "next/server";
import { sql, desc, and, eq, like, or } from "drizzle-orm";
import { db, bookings, users } from "@/lib/db";

/**
 * Экспорт броней в CSV (UTF-8 BOM, чтобы Excel правильно открыл).
 * Полноценный xlsx-экспорт — отдельным шагом через библиотеку `xlsx` или `exceljs`,
 * сейчас CSV даёт 95% работы и не тащит зависимостей.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const conds = [];
  const q = url.searchParams.get("q");
  const status = url.searchParams.get("status");
  const airport = url.searchParams.get("airport");
  if (q) conds.push(or(
    like(bookings.carNumber, `%${q.toUpperCase()}%`),
    like(bookings.carModel, `%${q}%`),
    like(users.phone, `%${q}%`),
    like(users.firstName, `%${q}%`),
  ));
  if (status) conds.push(eq(bookings.status, status as "new"));
  if (airport) conds.push(eq(bookings.airport, airport as "SVO"));
  const where = conds.length > 0 ? and(...conds) : undefined;

  const rows = await db
    .select({
      created: bookings.createdAt,
      airport: bookings.airport,
      from: bookings.dateFrom,
      to: bookings.dateTo,
      price: bookings.priceKopecks,
      status: bookings.status,
      car: bookings.carNumber,
      model: bookings.carModel,
      source: bookings.source,
      pointsEarned: bookings.loyaltyPointsEarned,
      pointsUsed: bookings.loyaltyPointsUsed,
      amocrm: bookings.amocrmLeadId,
      phone: users.phone,
      name: users.firstName,
      email: users.email,
      tier: users.loyaltyTier,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(5000);

  const headers = [
    "Создано", "Аэропорт", "Заезд", "Выезд", "Цена ₽", "Статус",
    "Гос.номер", "Модель", "Источник", "Начислено баллов", "Списано баллов",
    "amoCRM ID", "Телефон", "Имя", "Email", "Тариф",
  ];

  const lines = [headers.join(";")];
  for (const r of rows) {
    lines.push([
      r.created.toISOString(),
      r.airport,
      r.from.toISOString(),
      r.to.toISOString(),
      Math.round(r.price / 100),
      r.status,
      escape(r.car),
      escape(r.model),
      r.source,
      r.pointsEarned,
      r.pointsUsed,
      r.amocrm ?? "",
      escape(r.phone),
      escape(r.name),
      escape(r.email),
      r.tier ?? "",
    ].join(";"));
  }

  const csv = "﻿" + lines.join("\r\n");   // BOM для Excel
  const filename = `bookings_${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function escape(v: string | null | undefined) {
  if (v === null || v === undefined) return "";
  if (/[;"\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
