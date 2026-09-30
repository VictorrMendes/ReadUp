import { AppState, type AppStateStatus } from "react-native";

import { ApiError } from "@/lib/api";
import type { ProgressResult } from "@/lib/reading";

import { startReadingSession } from "./use-reading-session";

const OK: ProgressResult = {
  progress: 0,
  words_read: 0,
  words_credited: 0,
  completed: false,
  xp_gained: 0,
  goal_met: false,
  streak: 0,
};

let appState: AppStateStatus = "active";
let onAppStateChange: (state: AppStateStatus) => void = () => {};

beforeEach(() => {
  jest.useFakeTimers();
  appState = "active";
  Object.defineProperty(AppState, "currentState", { get: () => appState, configurable: true });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, handler) => {
    onAppStateChange = handler;
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function start(send = jest.fn().mockResolvedValue(OK)) {
  const onUnauthorized = jest.fn();
  const onResult = jest.fn();
  const session = startReadingSession({ send, initialProgress: 0, onResult, onUnauthorized });
  return { session, send, onResult, onUnauthorized };
}

const advance = (seconds: number) => jest.advanceTimersByTimeAsync(seconds * 1000);

test("abre a sessão com 0 s ao iniciar e envia após 15 s com o maior progresso", async () => {
  const { session, send, onResult } = start();
  await advance(0);
  expect(send).toHaveBeenCalledWith(0, 0);
  expect(onResult).toHaveBeenCalledWith(OK, { xp: 0, goalMet: false, streak: 0 });

  session.report(40.7);
  session.report(25); // voltar a rolagem não reduz
  await advance(14);
  expect(send).toHaveBeenCalledTimes(1);

  await advance(1);
  expect(send).toHaveBeenCalledTimes(2);
  expect(send).toHaveBeenLastCalledWith(40, 15);
  session.stop();
});

test("não conta tempo em background; envia ao sair e reabre ao voltar", async () => {
  const { session, send } = start();
  await advance(5);

  appState = "background";
  onAppStateChange("background");
  await advance(0);
  expect(send).toHaveBeenLastCalledWith(0, 5);

  await advance(60); // em background: nada conta
  appState = "active";
  onAppStateChange("active");
  await advance(0);
  expect(send).toHaveBeenLastCalledWith(0, 0); // reabre a sessão no servidor

  await advance(15);
  expect(send).toHaveBeenCalledTimes(4);
  expect(send).toHaveBeenLastCalledWith(0, 15);
  session.stop();
});

test("falha de rede mantém os segundos e reenvia depois", async () => {
  const send = jest
    .fn()
    .mockResolvedValueOnce(OK) // abertura
    .mockRejectedValueOnce(new TypeError("Network request failed"))
    .mockResolvedValue(OK);
  const { session } = start(send);

  await advance(15);
  await advance(15);

  expect(send).toHaveBeenCalledTimes(3);
  expect(send).toHaveBeenLastCalledWith(0, 30);
  session.stop();
});

test("401 chama onUnauthorized", async () => {
  const send = jest.fn().mockRejectedValue(new ApiError(401, "Não autenticado"));
  const { session, onUnauthorized } = start(send);

  await advance(0);

  expect(onUnauthorized).toHaveBeenCalledTimes(1);
  session.stop();
});

test("stop (sair da tela) envia o tempo acumulado", async () => {
  const { session, send } = start();
  await advance(7);

  session.stop();
  await advance(0);

  expect(send).toHaveBeenLastCalledWith(0, 7);
  await advance(30); // parado: não conta mais
  expect(send).toHaveBeenCalledTimes(2);
});

test("sem tempo nem avanço, só o envio de abertura", async () => {
  const { session, send } = start();
  await advance(0);

  session.stop();
  await advance(0);

  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith(0, 0);
});

test("soma o xp_gained dos envios e marca a meta cumprida durante a sessão", async () => {
  const send = jest
    .fn()
    .mockResolvedValueOnce(OK) // abertura
    .mockResolvedValueOnce({ ...OK, xp_gained: 9 })
    .mockResolvedValueOnce({ ...OK, xp_gained: 56, goal_met: true })
    .mockResolvedValue({ ...OK, xp_gained: 26, goal_met: true, completed: true });
  const { session, onResult } = start(send);

  await advance(15);
  expect(onResult).toHaveBeenLastCalledWith(expect.anything(), { xp: 9, goalMet: false, streak: 0 });
  await advance(15);
  expect(onResult).toHaveBeenLastCalledWith(expect.anything(), { xp: 65, goalMet: true, streak: 0 });
  await advance(15);

  expect(send).toHaveBeenCalledTimes(4);
  expect(onResult).toHaveBeenLastCalledWith(expect.anything(), { xp: 91, goalMet: true, streak: 0 });
  session.stop();
});

test("meta já cumprida antes da sessão não conta como cumprida nela", async () => {
  const send = jest.fn().mockResolvedValue({ ...OK, xp_gained: 3, goal_met: true });
  const { session, onResult } = start(send);

  await advance(15);

  expect(onResult).toHaveBeenLastCalledWith(expect.anything(), { xp: 6, goalMet: false, streak: 0 });
  session.stop();
});

test("expõe a ofensiva da última resposta", async () => {
  const send = jest
    .fn()
    .mockResolvedValueOnce({ ...OK, streak: 3 }) // abertura: ofensiva de ontem
    .mockResolvedValue({ ...OK, xp_gained: 56, goal_met: true, streak: 4 });
  const { session, onResult } = start(send);

  await advance(0);
  expect(onResult).toHaveBeenLastCalledWith(expect.anything(), {
    xp: 0,
    goalMet: false,
    streak: 3,
  });
  await advance(15);

  expect(onResult).toHaveBeenLastCalledWith(expect.anything(), {
    xp: 56,
    goalMet: true,
    streak: 4,
  });
  session.stop();
});

// envio que só termina quando o teste manda
function pending() {
  let resolve: (value: ProgressResult) => void = () => {};
  const promise = new Promise<ProgressResult>((r) => (resolve = r));
  return { promise, resolve: () => resolve(OK) };
}

test("stop() durante um envio pendente envia o acumulado quando ele termina", async () => {
  const opening = pending();
  const send = jest.fn().mockReturnValueOnce(opening.promise).mockResolvedValue(OK);
  const { session } = start(send);
  session.report(30);
  await advance(7); // abertura ainda sem resposta

  session.stop(); // sair da tela / próximo capítulo
  await advance(0);
  expect(send).toHaveBeenCalledTimes(1); // não dispara em paralelo

  opening.resolve();
  await advance(0);
  expect(send).toHaveBeenCalledTimes(2);
  expect(send).toHaveBeenLastCalledWith(30, 7); // os 7 s e o progresso não se perdem
});

test("voltar do background durante um envio pendente ainda reabre a sessão", async () => {
  const inFlight = pending();
  const send = jest
    .fn()
    .mockResolvedValueOnce(OK) // abertura
    .mockReturnValueOnce(inFlight.promise) // envio dos 15 s, demora
    .mockResolvedValue(OK);
  const { session } = start(send);
  await advance(15);
  expect(send).toHaveBeenLastCalledWith(0, 15);

  appState = "background";
  onAppStateChange("background");
  appState = "active";
  onAppStateChange("active"); // reabertura pedida com o envio ainda pendente
  await advance(0);
  expect(send).toHaveBeenCalledTimes(2);

  inFlight.resolve();
  await advance(0);
  expect(send).toHaveBeenCalledTimes(3);
  expect(send).toHaveBeenLastCalledWith(0, 0); // abertura não foi descartada
  session.stop();
});
