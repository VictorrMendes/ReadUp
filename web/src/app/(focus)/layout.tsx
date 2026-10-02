import type { ReactNode } from "react";

import { RequireUser } from "@/components/shell/require-user";

// Telas de foco (leitor, revisão): sem o menu do app.
export default function FocusLayout({ children }: { children: ReactNode }) {
  return <RequireUser>{children}</RequireUser>;
}
