import {
  DEFAULT_SETTINGS,
  FONT_SIZES,
  bodyStyle,
  clampSizeIndex,
  parseSettings,
  titleStyle,
} from "./reader-settings";

test("tamanho fica dentro da escala", () => {
  expect(clampSizeIndex(-3)).toBe(0);
  expect(clampSizeIndex(99)).toBe(FONT_SIZES.length - 1);
  expect(clampSizeIndex(2)).toBe(2);
});

test("padrão: Literata 18 com entrelinha ~1.6 e título 28", () => {
  expect(bodyStyle(DEFAULT_SETTINGS)).toMatchObject({
    fontFamily: "Literata_400Regular",
    fontSize: 18,
    lineHeight: 29,
  });
  expect(titleStyle(DEFAULT_SETTINGS)).toMatchObject({
    fontFamily: "Literata_600SemiBold",
    fontSize: 28,
  });
});

test("sem serifa, maior e tema escuro mudam fonte, tamanho e cor", () => {
  const settings = { sizeIndex: 4, font: "sans", theme: "dark" } as const;
  expect(bodyStyle(settings)).toMatchObject({
    fontFamily: "Inter_400Regular",
    fontSize: 24,
    color: "#E7E5E2",
  });
  expect(titleStyle(settings).fontSize).toBe(34);
});

test("lê o salvo e volta ao padrão no que for inválido", () => {
  expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  expect(parseSettings("não é json")).toEqual(DEFAULT_SETTINGS);
  expect(parseSettings('{"sizeIndex":3,"font":"sans","theme":"sepia"}')).toEqual({
    sizeIndex: 3,
    font: "sans",
    theme: "sepia",
  });
  expect(parseSettings('{"sizeIndex":40,"font":"comic","theme":"neon"}')).toEqual({
    ...DEFAULT_SETTINGS,
    sizeIndex: FONT_SIZES.length - 1,
  });
});
