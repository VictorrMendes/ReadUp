import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/mascot.png" alt="" width={140} height={140} priority />
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="max-w-sm text-ink-soft">O endereço pode estar errado ou a página não existe mais.</p>
        <ButtonLink href="/">Voltar ao Início</ButtonLink>
      </div>
    </main>
  );
}
