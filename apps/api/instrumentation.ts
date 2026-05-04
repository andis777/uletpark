/**
 * Next.js 16 instrumentation.ts — точка инициализации серверной телеметрии.
 * Файл вызывается один раз при старте процесса (Fluid Compute reuses instance).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      // Не отправлять PII в события автоматически
      sendDefaultPii: false,
      ignoreErrors: ["UNAUTHORIZED", "INVALID_BODY", "NOT_FOUND"],
    });
  }
}

// Опционально: общий error-hook для Route Handlers
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routeKind: string }) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(err, { tags: { route: request.path, method: request.method, kind: context.routeKind } });
}
