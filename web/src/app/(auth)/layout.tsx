import Image from "next/image";
import type { ReactNode } from "react";

// Entrar/criar conta: no desktop, arte da marca à esquerda e formulário à direita; no celular,
// faixa índigo no topo e o formulário embaixo (como no app).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative flex flex-col justify-end overflow-hidden bg-gradient-to-b from-[#4846ae] to-primary-600 px-8 pb-10 pt-12 text-white lg:justify-center lg:px-16">
        <Image
          src="/mascot.png"
          alt=""
          width={220}
          height={220}
          priority
          className="absolute -right-6 -top-4 w-36 opacity-95 sm:w-44 lg:static lg:mb-8 lg:w-56"
        />
        <h1 className="text-4xl font-bold tracking-tight">ReadUp</h1>
        <p className="mt-2 text-lg text-white/90">Inglês, uma leitura por dia</p>
      </section>
      <main className="flex items-start justify-center px-6 py-10 lg:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
