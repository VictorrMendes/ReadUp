import type { Metadata } from "next";
import type { ReactNode } from "react";

// a página é client component: o título da aba vem daqui
export const metadata: Metadata = { title: "Ler" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
