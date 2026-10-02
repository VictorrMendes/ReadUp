import { enterFrom, listEnter } from "./motion";

test("entrada em cascata existe para os primeiros itens", () => {
  expect(enterFrom(0)).toBeDefined();
  expect(listEnter(0)).toBeDefined();
  expect(listEnter(8)).toBeDefined();
});

test("itens que aparecem rolando já chegam prontos", () => {
  expect(listEnter(9)).toBeUndefined();
  expect(listEnter(50)).toBeUndefined();
});
