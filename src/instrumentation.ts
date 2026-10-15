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
