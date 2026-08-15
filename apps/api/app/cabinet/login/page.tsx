import { redirect } from "next/navigation";
import { getClientFromCookie } from "@/lib/cabinet-auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Вход в личный кабинет · Улётная Парковка",
  robots: { index: false, follow: false },
};

export default async function CabinetLoginPage() {
  // Уже вошёл — незачем показывать форму.
  if (await getClientFromCookie()) redirect("/cabinet");

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={brand}>Улётная Парковка</div>
          <div style={brandSub}>парковка у Шереметьево</div>
        </div>
        <h1 style={title}>Личный кабинет</h1>
        <p style={lede}>
          Ваши брони, история и баллы. Вход по коду на почту — пароль не нужен.
        </p>
        <LoginForm />
        <p style={legal}>
          Нажимая «Получить код», вы соглашаетесь с{" "}
          <a href="https://uletnayaparkovka.ru/politika-konfidencialnosti" style={link}>
            политикой обработки персональных данных
          </a>
          .
        </p>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f4f7f7",
  padding: 20,
  fontFamily: "-apple-system, Segoe UI, Inter, Arial, sans-serif",
};
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#fff",
  border: "1px solid #e3ecee",
  borderRadius: 16,
  padding: "32px 28px",
  boxShadow: "0 10px 30px rgba(15,59,93,.06)",
};
const brand: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: "#0f3b5d" };
const brandSub: React.CSSProperties = { fontSize: 12, color: "#8a97a1", marginTop: 2 };
const title: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: "#14303f", margin: "0 0 8px" };
const lede: React.CSSProperties = { fontSize: 14, color: "#5c6b76", margin: "0 0 20px", lineHeight: 1.5 };
const legal: React.CSSProperties = { fontSize: 11.5, color: "#8a97a1", marginTop: 18, lineHeight: 1.5 };
const link: React.CSSProperties = { color: "#1a8f86" };
