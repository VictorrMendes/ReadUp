import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { RequireUser } from "@/components/shell/require-user";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireUser>
      <AppShell>{children}</AppShell>
    </RequireUser>
  );
}
