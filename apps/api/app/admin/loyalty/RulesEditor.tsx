"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Rule {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  active: boolean;
}

export function RulesEditor({ initial }: { initial: Rule[] }) {
  const router = useRouter();
  const [rules, setRules] = useState(initial);
  const [creating, setCreating] = useState(false);

  async function save(rule: Rule) {
    const res = await fetch("/api/admin/loyalty-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, name: rule.name, active: rule.active, config: rule.config }),
    });
    if (res.ok) router.refresh();
    else alert("Ошибка сохранения");
  }

  async function toggleActive(rule: Rule) {
    const updated = { ...rule, active: !rule.active };
    setRules(rs => rs.map(r => r.id === rule.id ? updated : r));
    save(updated);
  }

  async function createRule(form: { name: string; type: string; config: string }) {
    let cfg;
    try { cfg = JSON.parse(form.config); } catch { return alert("Невалидный JSON в конфиге"); }
    const res = await fetch("/api/admin/loyalty-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, type: form.type, config: cfg, active: true }),
    });
    if (res.ok) { setCreating(false); router.refresh(); }
    else alert("Ошибка создания");
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {rules.length === 0 && (
          <div style={{ ...card, gridColumn: "1 / -1", textAlign: "center", padding: 32, color: "#8a8580" }}>
            Правил нет. Запусти <code>pnpm db:seed:loyalty</code> или создай через форму ниже.
          </div>
        )}
        {rules.map(r => (
          <div key={r.id} style={{ ...card, opacity: r.active ? 1 : 0.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#c45d3e", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>{r.type}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 500, marginTop: 4 }}>{r.name}</h3>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={r.active} onChange={() => toggleActive(r)} />
                {r.active ? "ON" : "OFF"}
              </label>
            </div>
            <pre style={pre}>{JSON.stringify(r.config, null, 2)}</pre>
          </div>
        ))}
      </div>

      {!creating ? (
        <button onClick={() => setCreating(true)} style={btnAdd}>+ Добавить правило</button>
      ) : (
        <NewRuleForm onSubmit={createRule} onCancel={() => setCreating(false)} />
      )}
    </>
  );
}

function NewRuleForm({ onSubmit, onCancel }: { onSubmit: (f: { name: string; type: string; config: string }) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("cashback_pct");
  const [config, setConfig] = useState('{ "pct": 5 }');

  return (
    <div style={{ ...card, padding: 20 }}>
      <h3 style={{ fontSize: "0.95rem", fontWeight: 500, marginBottom: 12 }}>Новое правило</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <input placeholder="Название (для админки)" value={name} onChange={e => setName(e.target.value)} style={inp} />
        <select value={type} onChange={e => setType(e.target.value)} style={inp}>
          <option value="cashback_pct">cashback_pct</option>
          <option value="tier_threshold">tier_threshold</option>
          <option value="referral_bonus">referral_bonus</option>
        </select>
      </div>
      <textarea
        value={config} onChange={e => setConfig(e.target.value)}
        rows={4}
        style={{ ...inp, marginTop: 12, fontFamily: "monospace", fontSize: 12 }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => onSubmit({ name, type, config })} disabled={!name} style={btnSave}>Создать</button>
        <button onClick={onCancel} style={btnCancel}>Отмена</button>
      </div>
      <details style={{ marginTop: 12, fontSize: 11, color: "#8a8580" }}>
        <summary style={{ cursor: "pointer" }}>Примеры конфигов</summary>
        <pre style={{ ...pre, marginTop: 8 }}>{`cashback_pct:    { "pct": 5 }
tier_threshold:  { "tier": "silver", "threshold_kopeks": 500000 }
referral_bonus:  { "invited_rub": 500, "referrer_rub": 500 }`}</pre>
      </details>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fffefa", border: "1px solid #e3e0da", borderRadius: 12, padding: "1.25rem 1.5rem" };
const inp: React.CSSProperties = { padding: "8px 12px", fontSize: 13, border: "1px solid #d6d2cc", borderRadius: 6, background: "#fffefa", width: "100%", boxSizing: "border-box" };
const pre: React.CSSProperties = { fontSize: 11, fontFamily: "monospace", background: "#f6f4f0", padding: 8, borderRadius: 6, overflow: "auto" };
const btnAdd: React.CSSProperties = { padding: "10px 18px", background: "#c45d3e", color: "white", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 };
const btnSave: React.CSSProperties = { padding: "8px 14px", background: "#c45d3e", color: "white", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" };
const btnCancel: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#8a8580", border: "1px solid #d6d2cc", borderRadius: 6, fontSize: 13, cursor: "pointer" };
