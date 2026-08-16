"use client";

import { useState } from "react";

type Props = {
  slug: string;
  title: string;
  description: string | null;
  price: string | null;
  unit: string | null;
};

/**
 * Заявка, а не заказ: цену и возможность подтверждает менеджер — так же,
 * как с бронью. Поэтому никакой оплаты здесь нет и быть не должно.
 */
export function ServiceCard({ slug, title, description, price, unit }: Props) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function request() {
    setState("busy");
    try {
      const r = await fetch("/api/cabinet/service-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceSlug: slug }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div style={card}>
      <div style={{ flex: 1 }}>
        <div style={head}>{title}</div>
        {description && <div style={desc}>{description}</div>}
        <div style={priceRow}>
          {price ? (
            <>
              <b>{price}</b>
              {unit && <span style={unitTxt}> · {unit}</span>}
            </>
          ) : (
            <span style={unitTxt}>цену уточнит менеджер</span>
          )}
        </div>
      </div>

      {state === "done" ? (
        <div style={okBox}>Заявка принята — менеджер свяжется</div>
      ) : (
        <button onClick={request} disabled={state === "busy"} style={btn}>
          {state === "busy" ? "Отправляем…" : state === "error" ? "Ещё раз" : "Заказать"}
        </button>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14,
  padding: "14px 0", borderBottom: "1px solid #f0f4f5",
};
const head: React.CSSProperties = { fontSize: 14.5, fontWeight: 600, color: "#14303f" };
const desc: React.CSSProperties = { fontSize: 12.5, color: "#8a97a1", marginTop: 3, lineHeight: 1.45 };
const priceRow: React.CSSProperties = { fontSize: 13, color: "#14303f", marginTop: 6 };
const unitTxt: React.CSSProperties = { color: "#8a97a1", fontSize: 12.5 };
const btn: React.CSSProperties = {
  background: "#fff", border: "1px solid #86a82a", color: "#5d7519", borderRadius: 9,
  padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
};
const okBox: React.CSSProperties = {
  fontSize: 12.5, color: "#2f7a44", background: "#f1f9f3", border: "1px solid #d6ecdc",
  borderRadius: 9, padding: "9px 12px", maxWidth: 200, lineHeight: 1.4,
};
