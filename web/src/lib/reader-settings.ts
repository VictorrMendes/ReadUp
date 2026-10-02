import { useCallback, useEffect, useState } from "react";

// Aparência do leitor escolhida no painel "Aa". Vale só para a tela de leitura (o resto do app
// segue o tema normal) e fica salva no aparelho.

export const FONT_SIZES = [16, 18, 20, 22, 24] as const;
const DEFAULT_SIZE_INDEX = 1; // 18, o tamanho de leitura do Design System

export type ReaderFont = "serif" | "sans";
export type ReaderThemeName = "light" | "sepia" | "dark";

export type ReaderSettings = { sizeIndex: number; font: ReaderFont; theme: ReaderThemeName };

export const DEFAULT_SETTINGS: ReaderSettings = {
  sizeIndex: DEFAULT_SIZE_INDEX,
  font: "serif",
  theme: "light",
};

export type ReaderTheme = {
  label: string;
  dark: boolean;
  background: string;
  text: string; // texto do artigo e títulos
  secondary: string; // metadados, crédito da fonte
  mark: string; // fundo da palavra tocada
  link: string;
  border: string;
};

// contraste texto / secundário sobre o fundo: claro 16.5 / 5.4, sépia 11.1 / 5.6, escuro 14.3 / 7.1
export const READER_THEMES: Record<ReaderThemeName, ReaderTheme> = {
  light: {
    label: "Claro",
    dark: false,
    background: "#FAF8F4",
    text: "#1C1917",
    secondary: "#6B6560",
    mark: "#E8E8F6",
    link: "#2F2E80",
    border: "#E7E2DA",
  },
  sepia: {
    label: "Sépia",
    dark: false,
    background: "#F4ECD8",
    text: "#3B2F20",
    secondary: "#6B5A44",
    mark: "#E3D3AE",
    link: "#5B4A33",
    border: "#E2D5B7",
  },
  dark: {
    label: "Escuro",
    dark: true,
    background: "#17161C",
    text: "#E7E5E2",
    secondary: "#A8A29E",
    mark: "#3A3970",
    link: "#B9B8F0",
    border: "#2E2C35",
  },
};

export function clampSizeIndex(index: number): number {
  return Math.min(FONT_SIZES.length - 1, Math.max(0, Math.round(index)));
}

/** Estilo do texto corrido: tamanho escolhido com entrelinha ~1.6. */
export function bodyStyle(settings: ReaderSettings) {
  const fontSize = FONT_SIZES[clampSizeIndex(settings.sizeIndex)];
  return {
    fontFamily: settings.font === "serif" ? "var(--font-serif)" : "var(--font-sans)",
    fontSize: `${fontSize}px`,
    lineHeight: 1.6,
    color: READER_THEMES[settings.theme].text,
  };
}

/** Título do texto: acompanha o tamanho escolhido (28 no padrão). */
export function titleStyle(settings: ReaderSettings) {
  const fontSize = 28 + FONT_SIZES[clampSizeIndex(settings.sizeIndex)] - 18;
  return {
    fontFamily: settings.font === "serif" ? "var(--font-serif)" : "var(--font-sans)",
    fontWeight: settings.font === "serif" ? 600 : 700,
    fontSize: `${fontSize}px`,
    lineHeight: 1.28,
    color: READER_THEMES[settings.theme].text,
  };
}

/** Lê o que veio do armazenamento; qualquer coisa inválida volta ao padrão. */
export function parseSettings(raw: string | null): ReaderSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return DEFAULT_SETTINGS;
    const { sizeIndex, font, theme } = data as Record<string, unknown>;
    return {
      sizeIndex:
        typeof sizeIndex === "number" ? clampSizeIndex(sizeIndex) : DEFAULT_SETTINGS.sizeIndex,
      font: font === "serif" || font === "sans" ? font : DEFAULT_SETTINGS.font,
      theme:
        typeof theme === "string" && theme in READER_THEMES
          ? (theme as ReaderThemeName)
          : DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const STORAGE_KEY = "readup.reader_settings";

function load(): ReaderSettings {
  try {
    return parseSettings(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_SETTINGS; // navegação privada, armazenamento bloqueado
  }
}

/** Preferências do leitor salvas no navegador (só deste aparelho). */
export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);

  // lê depois de montar: no servidor não há localStorage
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(load());
  }, []);

  const update = useCallback((change: Partial<ReaderSettings>) => {
    setSettings((current) => {
      const next = {
        ...current,
        ...change,
        sizeIndex: clampSizeIndex(change.sizeIndex ?? current.sizeIndex),
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // sem armazenamento: vale só nesta visita
      }
      return next;
    });
  }, []);

  return { settings, update };
}
