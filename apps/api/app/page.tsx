import { amocrmInfo } from "@/lib/amocrm";

export default function Home() {
  return (
    <main style={{
      maxWidth: 720, margin: "4rem auto", padding: "0 2rem",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#1a1d24",
    }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 400, marginBottom: "0.5rem" }}>Улётная — Backend & Admin</h1>
      <p style={{ color: "#8a8580", marginBottom: "2rem" }}>
        amoCRM режим: <strong>{amocrmInfo.isStub ? "STUB (без боевых ключей)" : `LIVE (${amocrmInfo.domain})`}</strong>
      </p>

      <h2 style={{ marginTop: "2rem", fontSize: "1.2rem" }}>Endpoints</h2>
      <ul style={{ lineHeight: 1.9 }}>
        <li><code>POST /api/auth/request-otp</code> — запросить код</li>
        <li><code>POST /api/auth/verify-otp</code> — войти</li>
        <li><code>GET  /api/me</code> — профиль</li>
        <li><code>DELETE /api/me</code> — удалить аккаунт (App Store 5.1.1(v))</li>
        <li><code>GET  /api/bookings</code> — список броней пользователя</li>
        <li><code>POST /api/bookings</code> — создать бронь</li>
        <li><code>POST /api/bookings/sync-mine</code> — синк броней из amoCRM</li>
        <li><code>POST /api/calc</code> — калькулятор стоимости</li>
        <li><code>GET  /api/loyalty</code> — статус лояльности</li>
        <li><code>POST /api/events</code> — событие аналитики</li>
        <li><code>POST /api/webhooks/amocrm</code> — приём webhook от amoCRM</li>
      </ul>

      <h2 style={{ marginTop: "2rem", fontSize: "1.2rem" }}>Ссылки</h2>
      <ul style={{ lineHeight: 1.9 }}>
        <li><a href="/admin" style={{ color: "#3FB8AF" }}>/admin</a> — админ-панель</li>
        <li><a href="/api/openapi" style={{ color: "#3FB8AF" }}>/api/openapi</a> — Swagger JSON</li>
        <li><a href="/landing" style={{ color: "#3FB8AF" }}>/landing</a> — превью маркетингового лендинга (внутри)</li>
        <li><code>docs/02-api-contract.md</code> — REST контракт</li>
      </ul>
    </main>
  );
}
