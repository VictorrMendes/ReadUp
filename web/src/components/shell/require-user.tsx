"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { useMe } from "@/lib/session";
import { isOnboarded } from "@/lib/user";

/** Carrega o usuário antes das telas do app e manda para o onboarding se faltar nível ou meta. */
export function RequireUser({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = useMe();
  const needsOnboarding = me.data !== undefined && !isOnboarded(me.data);

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  if (me.error) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-error-text">{errorMessage(me.error, "Não foi possível carregar seus dados.")}</p>
          <Button onClick={() => void me.refetch()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }
  if (!me.data || needsOnboarding) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Carregando">
        <Image src="/mascot.png" alt="" width={96} height={96} className="animate-pulse" priority />
      </div>
    );
  }
  return <>{children}</>;
}
