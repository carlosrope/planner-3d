import { NextResponse } from "next/server";
import { z } from "zod";
import { reportError } from "@/lib/sentry";
import { clientIp, makeLimiter } from "@/lib/suggestion";

// Errores del navegador (el celular de la planner) → Sentry, sin exponer el DSN ni cargar scripts de terceros.

const body = z.object({
  message: z.string().max(2000),
  type: z.string().max(100).optional(),
  stack: z.string().max(8000).optional(),
  url: z.string().max(500).optional(),
});

// 30 errores por hora desde la misma conexión, para que nadie gaste la cuota de Sentry.
const perHour = makeLimiter(30, 60 * 60 * 1000);

export async function POST(request: Request) {
  if (!process.env.SENTRY_DSN) return new NextResponse(null, { status: 204 });
  if (!perHour(clientIp(request.headers))) return new NextResponse(null, { status: 429 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  await reportError({ ...parsed.data, source: "browser", userAgent: request.headers.get("user-agent") ?? undefined });
  return new NextResponse(null, { status: 204 });
}
