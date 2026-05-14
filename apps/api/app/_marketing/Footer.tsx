export function Footer() {
  return (
    <footer style={{ background: "var(--graphite)", color: "white", padding: "56px 0 24px" }}>
      <div className="container">
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 40, marginBottom: 40,
        }} className="footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: "var(--primary)",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 20,
              }}>У</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Улётная Парковка</div>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 16, lineHeight: 1.6 }}>
              Парковка у аэропорта Шереметьево с бесплатным трансфером 24/7.
              Договор хранения. 10 лет работаем на рынке.
            </p>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.4)",
              padding: 12, background: "rgba(255,255,255,0.04)",
              borderRadius: 8, marginBottom: 12,
            }}>
              <strong style={{ color: "rgba(255,255,255,0.7)" }}>ИП Улётная Парковка</strong><br />
              ОГРНИП: 316774600421050 · ИНН: 770170200000<br />
              Адрес: Московская обл., г.о. Химки, с. Чашниково
            </div>
          </div>

          <div>
            <h4 style={{ color: "white", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Услуги</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              <li><a href="#services" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Парковка</a></li>
              <li><a href="#services" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Ночёвка</a></li>
              <li><a href="#pricing" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Тарифы</a></li>
              <li><a href="/admin" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Корпоративным клиентам</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: "white", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Информация</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              <li><a href="#faq" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Вопросы и ответы</a></li>
              <li><a href="#reviews" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Отзывы</a></li>
              <li><a href="/oferta" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Публичная оферта</a></li>
              <li><a href="/privacy" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Политика данных</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: "white", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Контакты</h4>
            <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
              <a href="tel:+79099148881" style={{ color: "white", fontWeight: 700 }}>📞 +7 (909) 914-88-81</a>
              <a href="https://wa.me/79099148881" style={{ color: "rgba(255,255,255,0.7)" }}>💬 WhatsApp</a>
              <a href="https://t.me/uletnayaparkovka" style={{ color: "rgba(255,255,255,0.7)" }}>✈ Telegram</a>
              <a href="mailto:uletnayaparkovka@gmail.com" style={{ color: "rgba(255,255,255,0.7)" }}>✉ uletnayaparkovka@gmail.com</a>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                Работаем 24/7
              </div>
            </div>
          </div>
        </div>

        <div style={{
          paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex", justifyContent: "space-between",
          fontSize: 12, color: "rgba(255,255,255,0.4)", flexWrap: "wrap", gap: 12,
        }}>
          <div>© 2016–2026 Улётная Парковка. Все права защищены.</div>
          <div>Сделано с заботой о вашем времени ✈</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .footer-grid > div:first-child { grid-column: 1 / -1; }
        }
        @media (max-width: 600px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
