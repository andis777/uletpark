import { amocrmInfo } from "@/lib/amocrm";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 2rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 400 }}>Улётная — Backend & Admin</h1>
      <p style={{ color: "#8a8580" }}>
        amoCRM режим: <strong>{amocrmInfo.isStub ? "STUB (без боевых ключей)" : `LIVE (${amocrmInfo.domain})`}</strong>
      </p>
      <h2 style={{ marginTop: "2rem", fontSize: "1.2rem" }}>Endpoints</h2>
      <ul>
        <li><code>POST /api/auth/request-otp</code> — запросить код</li>
        <li><code>POST /api/auth/verify-otp</code> — войти</li>
        <li><code>GET  /api/bookings</code> — список броней пользователя</li>
        <li><code>POST /api/bookings</code> — создать бронь</li>
        <li><code>GET  /api/loyalty</code> — статус лояльности</li>
        <li><code>POST /api/events</code> — записать событие аналитики</li>
        <li><code>POST /api/webhooks/amocrm</code> — приём webhook от amoCRM</li>
      </ul>
      <p>
        Полный контракт: <a href="/admin">/admin</a> · <code>docs/02-api-contract.md</code>
      </p>
    </main>
  );
}
