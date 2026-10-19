import type { Instrumentation } from "next";

/** Errores del servidor → Sentry (solo con SENTRY_DSN). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (!process.env.SENTRY_DSN) return;
  const { reportError } = await import("./lib/sentry");
  const e = err instanceof Error ? err : new Error(String(err));
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  await reportError({
    message: e.message,
    type: e.name,
    stack: e.stack,
    source: "server",
    url: request.path,
    userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : undefined,
    extra: { method: request.method, digest, routerKind: context.routerKind, routePath: context.routePath, routeType: context.routeType },
  });
};

/** Al arrancar en producción, avisa en el log de Railway si falta algo que los clientes notarían. */
export function register() {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_RUNTIME === "edge") return;
  const missing = [
    ["RESEND_API_KEY", "los correos (olvidé mi contraseña, sugerencias) no salen"],
    ["EMAIL_FROM", "los correos salen de onboarding@resend.dev y no llegan a los clientes"],
    ["ADMIN_EMAILS", "nadie puede entrar al panel de administración"],
    ["SENTRY_DSN", "los errores no se reportan"],
  ].filter(([name]) => !process.env[name]?.trim());
  for (const [name, why] of missing) console.warn(`[plantea] Falta ${name}: ${why}.`);
}
