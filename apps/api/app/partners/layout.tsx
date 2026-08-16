import type { ReactNode } from "react";
import { SiteShell } from "../_components/SiteShell";

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
