import type { PressableAndroidRippleConfig, TextStyle, ViewStyle } from "react-native";

// Tokens do Design System (nota "ReadUp — Design System"). Telas usam só estes valores.
export const colors = {
  primary500: "#2563EB",
  primary600: "#1D4ED8",
  primary100: "#DBEAFE",
  success500: "#22C55E",
  success100: "#DCFCE7",
  success600: "#16A34A", // ícones de concluído (3.30:1 sobre surface); success500 fica na barra e superfícies
  streak: "#F97316",
  error: "#EF4444", // só borda e ícone (3.6:1 como texto não passa AA)
  errorText: "#DC2626", // texto de erro e fundo do botão destrutivo (4.62:1 sobre background)
  background: "#F8FAFC",
  surface: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0", // cards e divisórias
  borderStrong: "#64748B", // borda de campo de formulário (4.76:1 sobre surface)
  overlay: "rgba(15, 23, 42, 0.5)", // textPrimary a 50%: fundo escurecido atrás do BottomSheet
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

// Feedback de toque padrão (Button, ReadingCard, chips, OptionList): leve redução + cor de pressed.
export const pressedScale: ViewStyle = { transform: [{ scale: 0.98 }] };
export const ripple: PressableAndroidRippleConfig = { color: colors.primary100 };

// limite de escala da fonte do sistema para rótulos compactos (badges, chips, tab bar)
export const compactFontScale = 1.4;
