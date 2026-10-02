import { Easing, type PressableAndroidRippleConfig, type TextStyle, type ViewStyle } from "react-native";

// Tokens do Design System (nota "ReadUp — Design System" + design-v3). Telas usam só estes valores.
// Papéis: azul = marca e ação; verde = meta cumprida; laranja = só ofensiva; dourado = recompensa.
export const colors = {
  primary50: "#EFF6FF", // superfície tingida azul
  primary100: "#DBEAFE",
  primary200: "#BFDBFE",
  primary500: "#2563EB",
  primary600: "#1D4ED8",
  primary700: "#1E40AF", // texto sobre primary50 (8.01:1)
  success500: "#22C55E",
  success100: "#DCFCE7",
  success600: "#16A34A", // ícones de concluído (3.30:1 sobre surface); success500 fica na barra e superfícies
  success700: "#15803D", // texto sobre success100 (4.57:1)
  streak: "#F97316",
  streak50: "#FFF7ED", // fundo do cartão de ofensiva
  streak100: "#FFEDD5", // borda do cartão de ofensiva
  streak700: "#C2410C", // texto sobre streak50 (4.88) / streak100 (4.52)
  gold50: "#FFFBEB", // fundo de recompensa (XP e conquistas)
  gold100: "#FEF3C7", // fundo da medalha
  gold200: "#FDE68A", // trilho da barra dourada / borda
  gold600: "#D97706", // ícone e borda da medalha (3.19:1 sobre surface, só não-texto)
  gold700: "#B45309", // texto e ícone sobre gold50/100/surface (4.84 / 4.51 / 5.02)
  surfaceMuted: "#F1F5F9", // círculo de medalha bloqueada, dia sem meta
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

export const radius = { sm: 8, md: 12, lg: 16, card: 20, sheet: 28, pill: 999 } as const;

// sombra só no cartão herói de cada tela (a meta no Início)
export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderColor: "transparent",
  },
} satisfies Record<string, ViewStyle>;

// Movimento: uma linguagem só (ms). Só transform/opacity, com "reduzir movimento" respeitado.
export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
  count: 600,
  easing: Easing.out(Easing.cubic),
  pop: { speed: 14, bounciness: 8 }, // Animated.spring
  // Reanimated (plan.txt §3): toque afunda rápido e volta com mola; painel sobe com mola
  press: 90,
  pressScale: 0.97,
  progress: 500,
  ring: 800, // anel da meta enchendo
  celebrate: 1500, // confete
  release: { damping: 15, stiffness: 300 },
  sheet: { damping: 20, stiffness: 220 },
} as const;

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
  // número da meta
  hero: {
    fontFamily: fontFamily.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  display: { fontFamily: fontFamily.bold, fontSize: fontSize.display, lineHeight: 40 },
  h1: { fontFamily: fontFamily.bold, fontSize: fontSize.h1, lineHeight: 36, letterSpacing: -0.3 },
  h2: { fontFamily: fontFamily.semibold, fontSize: fontSize.h2, lineHeight: 30 },
  h3: { fontFamily: fontFamily.semibold, fontSize: fontSize.h3, lineHeight: 26 },
  body: { fontFamily: fontFamily.regular, fontSize: fontSize.body, lineHeight: 24 },
  // leitura longa: line-height ~1.6
  reading: { fontFamily: fontFamily.regular, fontSize: fontSize.reading, lineHeight: 29 },
  small: { fontFamily: fontFamily.regular, fontSize: fontSize.small, lineHeight: 20 },
  caption: { fontFamily: fontFamily.regular, fontSize: fontSize.caption, lineHeight: 16 },
  // rótulo de seção em maiúsculas ("META DE HOJE")
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.caption,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  // números dos tiles
  stat: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ["tabular-nums"],
  },
} satisfies Record<string, TextStyle>;

export type ColorToken = keyof typeof colors;
export type TypographyVariant = keyof typeof typography;

// área de toque mínima (acessibilidade)
export const touchTarget = 44;

// Feedback de toque padrão: escala animada no PressableScale + cor de pressed / ripple.
export const ripple: PressableAndroidRippleConfig = { color: colors.primary100 };

// limite de escala da fonte do sistema para rótulos compactos (badges, chips, tab bar)
export const compactFontScale = 1.4;
