import { NextResponse } from "next/server";
import { z } from "zod";
import { calculate } from "@/lib/calculator";

const Body = z.object({
  airport: z.enum(["SVO", "DME", "VKO"]),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  promoCode: z.string().optional(),
  useLoyaltyPoints: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY", issues: body.error.issues }, { status: 400 });
  return NextResponse.json(calculate(body.data));
}
