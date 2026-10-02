import type { ReactNode } from "react";

/** Cabeçalho e largura padrão das telas do app. */
export function Page({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      {title && (
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {actions}
        </div>
      )}
      {children}
    </main>
  );
}
