"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/cabinet/logout", { method: "POST" });
      router.replace("/cabinet/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={logout} disabled={busy} style={btn}>
      {busy ? "Выходим…" : "Выйти"}
    </button>
  );
}

// Кнопка переехала из тёмной шапки в светлое тело страницы — отсюда и цвета.
const btn: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #d5e0e4",
  color: "#5c6b76",
  borderRadius: 8,
  padding: "8px 15px",
  fontSize: 13,
  whiteSpace: "nowrap",
  cursor: "pointer",
};
