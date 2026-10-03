"use client";

import { BookOpen, Home, Languages, LogOut, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { useSignOut } from "@/lib/session";

export const NAV = [
  { href: "/", label: "Início", icon: Home },
  { href: "/ler", label: "Ler", icon: BookOpen, also: ["/livro", "/texto"] },
  { href: "/vocabulario", label: "Vocabulário", icon: Languages, also: ["/revisao"] },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

/** Item ativo: a raiz só quando é exatamente "/", as outras também nas sub-rotas e nas rotas
 * relacionadas (`also`: um livro aberto pertence a "Ler"). */
export function isActive(href: string, pathname: string, also: readonly string[] = []): boolean {
  if (href === "/") return pathname === "/";
  return [href, ...also].some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

// Desktop: menu lateral fixo. Celular/tablet: barra inferior (como as abas do app).
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  // o ícone da aba só salta depois de uma troca de tela (não na primeira carga)
  const [lastPath, setLastPath] = useState(pathname);
  const [navigated, setNavigated] = useState(false);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setNavigated(true);
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2">
          <Image src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl" />
          <span className="text-xl font-bold text-primary-600">ReadUp</span>
        </Link>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon, ...rest }) => {
            const active = isActive(href, pathname, "also" in rest ? rest.also : []);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold transition-colors",
                  active ? "bg-primary-50 text-primary-700" : "text-ink-soft hover:bg-paper hover:text-ink",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-ink-soft hover:bg-paper hover:text-ink"
        >
          <LogOut className="size-5" aria-hidden />
          Sair
        </button>
      </aside>

      <div className="pb-20 lg:pb-0">{children}</div>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map(({ href, label, icon: Icon, ...rest }) => {
          const active = isActive(href, pathname, "also" in rest ? rest.also : []);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-transform active:scale-95",
                active ? "text-primary-500" : "text-ink-soft",
              )}
            >
              <Icon
                className={cn("size-6", active && navigated && "animate-[tab-bounce_300ms_var(--ease-standard)]")}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
