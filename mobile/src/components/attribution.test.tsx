import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { Attribution } from "./attribution";

const URL = "https://en.wikinews.org/wiki/Pope_Leo_XIV_visits_four_nations_in_Africa";

afterEach(() => jest.restoreAllMocks());

test("mostra o crédito e o link acessível que abre o original", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  await render(<Attribution text="Fonte: Wikinews · CC BY 4.0" url={URL} />);

  expect(screen.getByText("Fonte: Wikinews · CC BY 4.0")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("link", { name: "Ler original" }));

  expect(open).toHaveBeenCalledWith(URL);
});

test("sem link web não mostra 'Ler original'", async () => {
  await render(<Attribution text="Fonte: VOA Learning English" url={null} />);
  expect(screen.queryByRole("link")).not.toBeOnTheScreen();

  await render(<Attribution text="Fonte: X" url="javascript:alert(1)" />);
  expect(screen.queryByRole("link")).not.toBeOnTheScreen();
});
