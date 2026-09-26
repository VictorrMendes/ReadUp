import type { TextStyle } from "react-native";

// Tokens do Design System (nota "ReadUp — Design System"). Telas usam só estes valores.
export const colors = {
  primary500: "#2563EB",
  primary600: "#1D4ED8",
  primary100: "#DBEAFE",
  success500: "#22C55E",
  success100: "#DCFCE7",
  streak: "#F97316",
  error: "#EF4444",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, card: 20 } as const;

export const fontSize = {
  display: 32,
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  reading: 18,
  small: 14,
  caption: 12,
} as const;

// Inter carregada no src/app/_layout.tsx (useFonts). Com fonte custom, o peso vem da família, não de fontWeight.
export const fontFamily = {
  regular: "Inter_400Regular",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const typography = {
  display: { fontFamily: fontFamily.bold, fontSize: fontSize.display, lineHeight: 40 },
  h1: { fontFamily: fontFamily.bold, fontSize: fontSize.h1, lineHeight: 36 },
  h2: { fontFamily: fontFamily.semibold, fontSize: fontSize.h2, lineHeight: 30 },
  h3: { fontFamily: fontFamily.semibold, fontSize: fontSize.h3, lineHeight: 26 },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.body, lineHeight: 24 },
  // leitura longa: line-height ~1.6
  reading: { fontFamily: fontFamily.regular, fontSize: fontSize.reading, lineHeight: 29 },
  small: { fontFamily: fontFamily.regular, fontSize: fontSize.small, lineHeight: 20 },
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.caption, lineHeight: 16 },
} satisfies Record<string, TextStyle>;

export type ColorToken = keyof typeof colors;
export type TypographyVariant = keyof typeof typography;

// área de toque mínima (acessibilidade)
export const touchTarget = 44;
