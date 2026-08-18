"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  dateToISO: string;      // текущая дата выезда, YYYY-MM-DD
  carNumber: string | null;
  carModel: string | null;
};

/**
 * Действия по активной броне: продлить и поправить авто.
 *
 * Продление — запрос: цену за новый срок называет менеджер, как и при брони.
 * Авто — правим сразу: это данные клиента, на цену не влияют, а неверный номер
 * создаёт трение на въезде.
 */
export function BookingActions({ bookingId, dateToISO, carNumber, carModel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<null | "extend" | "car">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [newDate, setNewDate] = useState("");
  const [num, setNum] = useState(carNumber ?? "");
  const [model, setModel] = useState(carModel ?? "");

  async function send(url: string, method: string, body: unknown, okText: string) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setMsg({ kind: "ok", text: okText });
        setOpen(null);
        router.refresh();
      } else {
        setMsg({ kind: "err", text: errorText(j.error) });
      }
    } catch {
      setMsg({ kind: "err", text: "Сеть недоступна. Попробуйте ещё раз или позвоните нам." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {open === null && (
        <div style={rowBtns}>
          <button style={link} onClick={() => { setOpen("extend"); setMsg(null); }}>Продлить</button>
          <button style={link} onClick={() => { setOpen("car"); setMsg(null); }}>Изменить авто</button>
        </div>
      )}

      {open === "extend" && (
        <div style={box}>
          <div style={label}>До какого числа продлить</div>
          <input
            type="date"
            value={newDate}
            min={nextDay(dateToISO)}
            onChange={(e) => setNewDate(e.target.value)}
            style={input}
          />
          <div style={hint}>Сейчас бронь до {ru(dateToISO)}. Стоимость подтвердит менеджер.</div>
          <div style={rowBtns}>
            <button
              disabled={busy || !newDate}
              onClick={() => send(`/api/cabinet/booking/${bookingId}/extend`, "POST", { dateTo: newDate }, "Запрос отправлен — менеджер свяжется")}
              style={primary}
            >
              {busy ? "Отправляем…" : "Отправить запрос"}
            </button>
            <button style={link} onClick={() => setOpen(null)}>Отмена</button>
          </div>
        </div>
      )}

      {open === "car" && (
        <div style={box}>
          <div style={label}>Гос. номер</div>
          <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="А123ВС777" style={input} />
          <div style={{ ...label, marginTop: 10 }}>Модель</div>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Kia Rio" style={input} />
          <div style={rowBtns}>
            <button
              disabled={busy}
              onClick={() => send(`/api/cabinet/booking/${bookingId}/car`, "PATCH", { carNumber: num, carModel: model }, "Данные обновлены")}
              style={primary}
            >
              {busy ? "Сохраняем…" : "Сохранить"}
            </button>
            <button style={link} onClick={() => setOpen(null)}>Отмена</button>
          </div>
        </div>
      )}

      {msg && (
        <div style={msg.kind === "ok" ? okBox : errBox}>{msg.text}</div>
      )}
    </div>
  );
}

function nextDay(iso: string): string {
  const d = new Date(iso + "T12:00:00+03:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function ru(iso: string): string {
  return new Date(iso + "T12:00:00+03:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}
function errorText(code?: string): string {
  switch (code) {
    case "DATE_NOT_LATER": return "Новая дата должна быть позже текущей.";
    case "BOOKING_CLOSED": return "Бронь уже завершена или отменена.";
    case "NOT_FOUND": return "Бронь не найдена.";
    case "UNAUTHORIZED": return "Сессия истекла — войдите заново.";
    default: return "Не получилось. Попробуйте ещё раз или позвоните нам.";
  }
}

const rowBtns: React.CSSProperties = { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 8 };
const link: React.CSSProperties = {
  background: "none", border: 0, padding: 0, color: "#1a8f86",
  fontSize: 12.5, cursor: "pointer", textDecoration: "none",
};
const box: React.CSSProperties = {
  background: "#f7fafb", border: "1px solid #e3ecee", borderRadius: 10,
  padding: "12px 14px", marginTop: 8, maxWidth: 340,
};
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase",
  color: "#5c6b76", marginBottom: 5,
};
const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", border: "1px solid #d5e0e4",
  borderRadius: 8, padding: "9px 11px", fontSize: 14, fontFamily: "inherit", color: "#14303f",
};
const hint: React.CSSProperties = { fontSize: 11.5, color: "#8a97a1", marginTop: 6, lineHeight: 1.45 };
const primary: React.CSSProperties = {
  background: "#86a82a", color: "#fff", border: 0, borderRadius: 8,
  padding: "9px 15px", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const okBox: React.CSSProperties = {
  fontSize: 12.5, color: "#2f7a44", background: "#f1f9f3", border: "1px solid #d6ecdc",
  borderRadius: 8, padding: "8px 11px", marginTop: 8, maxWidth: 340, lineHeight: 1.4,
};
const errBox: React.CSSProperties = {
  fontSize: 12.5, color: "#a2472f", background: "#fdf1ee", border: "1px solid #f2d3ca",
  borderRadius: 8, padding: "8px 11px", marginTop: 8, maxWidth: 340, lineHeight: 1.4,
};
