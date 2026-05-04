"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncTrigger() {
  const router = useRouter();
  const [pipelineName, setPipelineName] = useState("Улётная парковка");
  const [sinceDays, setSinceDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; linked: number; pipelineId: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function trigger() {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineName,
          sinceDays: parseInt(sinceDays) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Ошибка");
      setResult({
        inserted: data.result.inserted,
        updated: data.result.updated,
        linked: data.result.linkedToUsers + (data.orphans?.linked ?? 0),
        pipelineId: data.result.pipelineId,
      });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12, alignItems: "end" }}>
        <div>
          <label style={lbl}>Воронка (case-insensitive substring)</label>
          <input
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            style={inp}
            placeholder="Улётная парковка"
          />
        </div>
        <div>
          <label style={lbl}>Дней назад (0 = всё)</label>
          <input
            type="number"
            value={sinceDays}
            onChange={(e) => setSinceDays(e.target.value)}
            style={inp}
            min="0"
          />
        </div>
        <button onClick={trigger} disabled={busy} style={btn}>
          {busy ? "Синхронизация..." : "Запустить"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 16, padding: 12, background: "#ecf8f1", border: "1px solid #1a6e4e", borderRadius: 8, color: "#1a6e4e", fontSize: 13 }}>
          ✓ Готово{result.pipelineId ? ` (pipeline #${result.pipelineId})` : ""}: <strong>+{result.inserted} новых</strong>, ~{result.updated} обновлено, → {result.linked} привязано к клиентам
        </div>
      )}
      {error && (
        <div style={{ marginTop: 16, padding: 12, background: "#fbece8", border: "1px solid #a54a3a", borderRadius: 8, color: "#a54a3a", fontSize: 13 }}>
          ✗ {error}
        </div>
      )}

      <p style={{ marginTop: 12, fontSize: 11, color: "#8a8580" }}>
        Ищет воронку по имени, идёт постранично через amoCRM API (250/стр), upsert по amocrm_lead_id, привязывает к user по совпадению телефона.
      </p>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#8a8580", marginBottom: 6 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid #d6d2cc", borderRadius: 6, background: "#fffefa", boxSizing: "border-box" };
const btn: React.CSSProperties = { padding: "8px 16px", background: "#c45d3e", color: "white", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500, height: 38 };
