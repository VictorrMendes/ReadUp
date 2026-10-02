import { cancelReminders, reminderDates, reminderMessage, parseReminder } from "./reminders";

jest.mock("expo-notifications", () => ({ cancelAllScheduledNotificationsAsync: jest.fn(async () => {}) }));
jest.mock("expo-secure-store", () => ({}));

const at = (d: Date) => `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d.getMinutes()}`;

test("antes do horário e sem meta: começa hoje; 7 lembretes seguidos", () => {
  const now = new Date(2026, 9, 1, 10, 0); // 1/10, 10h
  const dates = reminderDates("evening", now, false);
  expect(dates).toHaveLength(7);
  expect(dates.map(at).slice(0, 2)).toEqual(["1/10 20:0", "2/10 20:0"]);
});

test("meta de hoje cumprida ou horário já passou: pula hoje", () => {
  const morning = new Date(2026, 9, 1, 10, 0);
  expect(at(reminderDates("evening", morning, true)[0])).toBe("2/10 20:0");
  const late = new Date(2026, 9, 1, 21, 0);
  expect(at(reminderDates("evening", late, false)[0])).toBe("2/10 20:0");
});

test("desligado não agenda nada", () => {
  expect(reminderDates("off", new Date(), false)).toEqual([]);
});

test("mensagem usa a ofensiva quando existe", () => {
  expect(reminderMessage(12).title).toBe("Sua ofensiva de 12 dias está esperando");
  expect(reminderMessage(1).title).toBe("Sua ofensiva de 1 dia está esperando");
  expect(reminderMessage(0).title).toBe("Hora da leitura");
});

test("valor salvo inválido volta ao padrão (noite)", () => {
  expect(parseReminder("morning")).toBe("morning");
  expect(parseReminder(null)).toBe("evening");
  expect(parseReminder("lixo")).toBe("evening");
});

test("logout cancela os lembretes agendados (a mensagem é da conta que saiu)", async () => {
  const Notifications = jest.requireMock("expo-notifications");
  await cancelReminders();
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
});
