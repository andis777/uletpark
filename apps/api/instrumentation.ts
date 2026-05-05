// Sentry опционален — пакет не установлен по умолчанию.
// Чтобы включить: pnpm add @sentry/nextjs и расскомментировать ниже.

export async function register() {
  if (process.env.SENTRY_DSN) {
    console.log('[instrumentation] SENTRY_DSN set, but @sentry/nextjs not installed. Run: pnpm add @sentry/nextjs');
  }
}

export async function onRequestError(err: unknown, request: { path: string }) {
  console.error('[onRequestError]', request.path, err);
}
