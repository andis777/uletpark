import Link from "next/link";
import { ReactNode } from "react";

export function Shell({ children, active, adminEmail }: {
  children: ReactNode;
  active: "dashboard" | "bookings" | "users" | "loyalty" | "analytics" | "sync";
  adminEmail: string;
}) {
  const items = [
    { key: "dashboard", href: "/admin", label: "Дашборд" },
    { key: "bookings",  href: "/admin/bookings", label: "Заказы" },
    { key: "users",     href: "/admin/users", label: "Клиенты" },
    { key: "loyalty",   href: "/admin/loyalty", label: "Лояльность" },
    { key: "analytics", href: "/admin/analytics", label: "Аналитика" },
    { key: "sync",      href: "/admin/sync",      label: "Sync amoCRM" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, background: "#fffefa", borderRight: "1px solid #e3e0da", padding: "1.5rem 0" }}>
        <div style={{ padding: "0 1.5rem 1.5rem", borderBottom: "1px solid #e3e0da" }}>
          <div style={{ fontSize: 11, color: "#c45d3e", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Улётная</div>
          <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 22, fontWeight: 400 }}>Admin</div>
        </div>
        <nav style={{ padding: "1rem 0" }}>
          {items.map(i => (
            <Link
              key={i.key}
              href={i.href}
              style={{
                display: "block",
                padding: "10px 1.5rem",
                fontSize: 14,
                color: active === i.key ? "#c45d3e" : "#0a0a0a",
                textDecoration: "none",
                borderLeft: active === i.key ? "3px solid #c45d3e" : "3px solid transparent",
                fontWeight: active === i.key ? 500 : 400,
              }}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e3e0da", marginTop: "auto", position: "absolute", bottom: 0, width: 220 }}>
          <div style={{ fontSize: 11, color: "#8a8580", marginBottom: 6 }}>{adminEmail}</div>
          <form action="/api/admin/auth/logout" method="POST">
            <button type="submit" style={{ background: "none", border: "none", color: "#a54a3a", fontSize: 12, padding: 0, cursor: "pointer" }}>
              Выйти
            </button>
          </form>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "2rem 3rem", maxWidth: 1280 }}>
        {children}
      </main>
    </div>
  );
}
