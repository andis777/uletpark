"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) router.replace(next);
    else {
      const d = await res.json().catch(() => ({}));
      setErr(d.error === "INVALID_CREDENTIALS" ? "Неверный email или пароль" : "Ошибка входа");
    }
    setBusy(false);
  }

  return (
    <main style={{ maxWidth: 380, margin: "8rem auto", padding: "0 2rem" }}>
      <div style={{ fontSize: 12, letterSpacing: 4, color: "#c45d3e", textTransform: "uppercase", marginBottom: 12 }}>
        Admin Panel
      </div>
      <h1 style={{ fontSize: "2rem", fontWeight: 300, marginBottom: 32 }}>Улётная — вход</h1>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        {err && <div style={{ color: "#a54a3a", fontSize: 13 }}>{err}</div>}
        <button type="submit" disabled={busy} style={btnStyle}>
          {busy ? "..." : "Войти"}
        </button>
      </form>

      <p style={{ marginTop: 32, color: "#8a8580", fontSize: 12 }}>
        Нет доступа? Запусти <code>pnpm db:seed:admin</code> чтобы создать первого админа.
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 15,
  border: "1px solid #d6d2cc",
  borderRadius: 8,
  background: "#fffefa",
  fontFamily: "inherit",
};
const btnStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "#c45d3e",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  cursor: "pointer",
  fontWeight: 500,
};
