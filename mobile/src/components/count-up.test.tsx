import { act, render, screen } from "@testing-library/react-native";

import { CountUp } from "./count-up";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("conta de 0 até o valor final (pt-BR)", async () => {
  await render(<CountUp to={1240} prefix="+" reduceMotion={false} />);
  expect(screen.getByText("+0")).toBeOnTheScreen();

  await act(async () => {
    await jest.advanceTimersByTimeAsync(700);
  });

  expect(screen.getByText("+1.240")).toBeOnTheScreen();
  expect(screen.getByLabelText("+1.240")).toBeOnTheScreen(); // leitor de tela lê o final
});

test("com reduzir movimento mostra o valor final direto", async () => {
  await render(<CountUp to={640} reduceMotion />);

  expect(screen.getByText("640")).toBeOnTheScreen();
});

test("pular leva ao valor final sem esperar", async () => {
  const view = await render(<CountUp to={320} reduceMotion={false} />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(50);
  });
  expect(screen.queryByText("320")).not.toBeOnTheScreen();

  await view.rerender(<CountUp to={320} reduceMotion={false} skipped />);

  expect(screen.getByText("320")).toBeOnTheScreen();
});

test("com reduzir movimento ainda desconhecido, espera no valor inicial", async () => {
  await render(<CountUp to={90} reduceMotion={null} />);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(700);
  });

  expect(screen.getByText("0")).toBeOnTheScreen();
});
