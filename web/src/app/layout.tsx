import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { Providers } from "@/app/providers";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

import "./globals.css";

// fontes servidas pelo próprio app (sem Google Fonts no build nem no navegador): fontes variáveis
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
const literata = localFont({
  src: "../../node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2",
  variable: "--font-literata",
  weight: "200 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ReadUp", template: "%s · ReadUp" },
  description: "Inglês, uma leitura por dia.",
  applicationName: "ReadUp",
  // o app tem temas próprios (claro/sépia/escuro no leitor): pede ao Dark Reader para não alterar a página
  other: { "darkreader-lock": "true" },
  appleWebApp: { capable: true, title: "ReadUp", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#3b3a98",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${literata.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
