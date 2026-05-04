import type { ReactNode } from "react";

export const metadata = { title: "Улётная — API & Admin" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f4f0", color: "#0a0a0a" }}>
        {children}
      </body>
    </html>
  );
}
