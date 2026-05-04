"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoyaltyAdjuster({ userId, currentPoints }: { userId: string; currentPoints: number }) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(sign: 1 | -1) {
    const n = parseInt(delta);
    if (!n || n <= 0) return alert("Введи число баллов");
    if (sign === -1 && n > currentPoints) return alert("Нельзя списать больше доступного");
    setBusy(true);
    const res = await fetch("/api/admin/loyalty-adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, delta: n * sign, reason: reason || "manual_adjust" }),
    });
    setBusy(false);
    if (res.ok) {
      setDelta(""); setReason("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Ошибка");
    }
  }

  return (
    <div>
      <input
        type="number"
        placeholder="Кол-во баллов"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        style={inp}
      />
      <input
        type="text"
        placeholder="Причина (комментарий)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ ...inp, marginTop: 8 }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => submit(1)} disabled={busy} style={btnAdd}>+ Начислить</button>
        <button onClick={() => submit(-1)} disabled={busy} style={btnSub}>− Списать</button>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #d6d2cc", borderRadius: 6, background: "#fffefa", boxSizing: "border-box" };
const btnAdd: React.CSSProperties = { flex: 1, padding: "8px 10px", background: "#1a6e4e", color: "white", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 };
const btnSub: React.CSSProperties = { flex: 1, padding: "8px 10px", background: "#a54a3a", color: "white", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500 };
