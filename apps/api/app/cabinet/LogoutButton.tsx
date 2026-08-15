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

const btn: React.CSSProperties = {
  background: "rgba(255,255,255,.12)",
  border: "1px solid rgba(255,255,255,.3)",
  color: "#fff",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 13,
  cursor: "pointer",
};
