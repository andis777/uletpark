"use client";
import { useState } from "react";
import { faqData as faqs } from "./faq-data";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="section">
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Вопросы и ответы</div>
          <h2 style={{ color: "var(--graphite)" }}>Часто спрашивают</h2>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {faqs.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} style={{
                borderBottom: "1px solid var(--divider)",
                padding: "0",
              }}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{
                    width: "100%", textAlign: "left",
                    background: "transparent", border: "none",
                    padding: "20px 0",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    gap: 16, cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 17, fontWeight: 600, color: "var(--graphite)" }}>{f.q}</span>
                  <span style={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
                    background: isOpen ? "var(--primary)" : "var(--primary-soft)",
                    color: isOpen ? "white" : "var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 700, transition: "all 0.2s",
                  }}>
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div style={{
                    padding: "0 0 20px",
                    color: "var(--text-secondary)",
                    fontSize: 15, lineHeight: 1.65,
                  }}>
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

