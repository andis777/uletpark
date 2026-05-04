import type { ReactNode } from "react";

// Stub layout — каждая страница admin/* сама оборачивает себя в <Shell>,
// чтобы можно было маркировать active вкладку. Здесь только глобальные стили.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
