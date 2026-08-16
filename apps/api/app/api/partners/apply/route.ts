import { NextResponse } from "next/server";
import { z } from "zod";
import { db, partnerApplications } from "@/lib/db";
import { notifyPartnerApplication } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Шереметьево не принимаем: это наш аэропорт, подключать там чужие площадки —
// кормить собственных конкурентов. Ловим и латиницу, и частые опечатки.
const SVO = /(шереметьев|шеремет[ьъ]?ев|sheremet|\bsvo\b|уэс\s*в\s*о)/i;

const Body = z.object({
  company: z.string().max(200).optional(),
  contactName: z.string().min(2).max(120),
  phone: z.string().min(6).max(32),
  email: z.string().email().max(200).optional().or(z.literal("")),
  city: z.string().min(2).max(120),
  airport: z.string().min(2).max(120),
  spaces: z.number().int().min(1).max(100000).optional(),
  hasTransfer: z.boolean().optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const d = parsed.data;

  if (SVO.test(d.airport) || SVO.test(d.city)) {
    return NextResponse.json(
      { error: "SVO_EXCLUDED", message: "Шереметьево — наш аэропорт, там мы работаем сами. Ждём площадки в других городах." },
      { status: 422 }
    );
  }

  const [created] = await db
    .insert(partnerApplications)
    .values({
      company: d.company || null,
      contactName: d.contactName,
      phone: d.phone,
      email: d.email || null,
      city: d.city,
      airport: d.airport,
      spaces: d.spaces ?? null,
      hasTransfer: d.hasTransfer ?? null,
      message: d.message || null,
    })
    .returning();

  // Уведомление не должно ронять уже сохранённую заявку.
  notifyPartnerApplication({
    contactName: d.contactName,
    company: d.company,
    phone: d.phone,
    email: d.email || undefined,
    city: d.city,
    airport: d.airport,
    spaces: d.spaces,
    hasTransfer: d.hasTransfer,
    message: d.message,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: created.id });
}
