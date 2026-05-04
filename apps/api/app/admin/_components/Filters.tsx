"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export function Filters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [airport, setAirport] = useState(sp.get("airport") ?? "");

  // Debounce запроса в URL
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(sp.toString());
      q ? p.set("q", q) : p.delete("q");
      status ? p.set("status", status) : p.delete("status");
      airport ? p.set("airport", airport) : p.delete("airport");
      p.delete("page");
      router.replace("?" + p.toString());
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, airport]);

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      <input
        placeholder="Поиск (телефон, имя, номер машины)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={inp}
      />
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={sel}>
        <option value="">Любой статус</option>
        <option value="new">Новая</option>
        <option value="confirmed">Подтверждена</option>
        <option value="active">Активна</option>
        <option value="completed">Завершена</option>
        <option value="cancelled">Отменена</option>
      </select>
      <select value={airport} onChange={(e) => setAirport(e.target.value)} style={sel}>
        <option value="">Все аэропорты</option>
        <option value="SVO">Шереметьево</option>
        <option value="DME">Домодедово</option>
        <option value="VKO">Внуково</option>
      </select>
    </div>
  );
}

const inp: React.CSSProperties = { flex: 1, minWidth: 280, padding: "8px 12px", fontSize: 13, border: "1px solid #d6d2cc", borderRadius: 8, background: "#fffefa" };
const sel: React.CSSProperties = { padding: "8px 12px", fontSize: 13, border: "1px solid #d6d2cc", borderRadius: 8, background: "#fffefa" };
