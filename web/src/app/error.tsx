"use client";

import Image from "next/image";

import { Button, ButtonLink } from "@/components/ui/button";

// Erro inesperado numa tela: mensagem em português com saída, no lugar da página padrão do Next.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main role="alert" className="grid min-h-dvh place-items-center bg-paper p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/mascot.png" alt="" width={140} height={140} />
        <h1 className="text-2xl font-bold">Algo deu errado</h1>
        <p className="max-w-sm text-ink-soft">Tente de novo. Se continuar, volte ao Início.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Tentar novamente</Button>
          <ButtonLink href="/" variant="secondary">
            Ir para o Início
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
