"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StatusEditor({ id, current }: { id: string; current: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("Не удалось обновить");
  }

  const changed = status !== current;

  return (
    <div>
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={sel}>
        <option value="new">Новая</option>
        <option value="confirmed">Подтверждена</option>
        <option value="active">Активна</option>
        <option value="completed">Завершена</option>
        <option value="cancelled">Отменена</option>
      </select>
      <button
        onClick={save}
        disabled={!changed || busy}
        style={{ ...btn, opacity: !changed || busy ? 0.5 : 1, marginLeft: 8 }}
      >
        {busy ? "..." : "Сохранить"}
      </button>
      <p style={{ fontSize: 11, color: "#8a8580", marginTop: 8 }}>
        Статус «Завершена» автоматически начислит лояльность.
      </p>
    </div>
  );
}

const sel: React.CSSProperties = { padding: "6px 10px", fontSize: 13, border: "1px solid #d6d2cc", borderRadius: 6, background: "#fffefa" };
const btn: React.CSSProperties = { padding: "6px 12px", background: "#c45d3e", color: "white", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" };
