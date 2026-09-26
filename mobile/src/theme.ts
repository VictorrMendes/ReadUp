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

// área de toque mínima (acessibilidade)
export const touchTarget = 44;
