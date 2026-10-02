import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { Option } from "@/lib/preferences";

// Lembrete diário de leitura: notificação local (sem servidor, sem push). Em vez de um gatilho
// "todo dia", agenda os próximos dias um a um: assim o de hoje some quando a meta já foi cumprida.
// O app reagenda a cada abertura do Início; se a pessoa ficar uma semana sem abrir, os lembretes
// param (melhor que insistir para sempre).

// O Expo Go no Android não traz o expo-notifications (SDK 53+): só importar o módulo já derruba o
// app. Lá os lembretes ficam indisponíveis (a opção some da tela); num build do app funcionam.
export const remindersSupported = !(
  Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
);

type NotificationsModule = typeof import("expo-notifications");

function notifications(): NotificationsModule | null {
  if (!remindersSupported) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-notifications") as NotificationsModule;
}

export type ReminderTime = "morning" | "afternoon" | "evening" | "off";

const TIMES: Record<Exclude<ReminderTime, "off">, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  afternoon: { hour: 13, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

export const REMINDER_OPTIONS: Option<ReminderTime>[] = [
  { value: "morning", label: "Manhã", description: "Todo dia às 8h" },
  { value: "afternoon", label: "Tarde", description: "Todo dia às 13h" },
  { value: "evening", label: "Noite", description: "Todo dia às 20h" },
  { value: "off", label: "Sem lembrete", description: "Não enviar notificações" },
];

export const DEFAULT_REMINDER: ReminderTime = "evening";
const DAYS_AHEAD = 7;
const CHANNEL_ID = "reading-reminder";
const STORAGE_KEY = "readup.reminder";

/** Datas dos próximos lembretes: hoje (se ainda não passou e a meta não foi cumprida) e os dias
 * seguintes, até `DAYS_AHEAD` lembretes. */
export function reminderDates(
  time: ReminderTime,
  now: Date,
  goalMetToday: boolean,
  days = DAYS_AHEAD,
): Date[] {
  if (time === "off") return [];
  const { hour, minute } = TIMES[time];
  const dates: Date[] = [];
  for (let offset = 0; dates.length < days; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
    if (offset === 0 && (goalMetToday || date <= now)) continue;
    dates.push(date);
  }
  return dates;
}

/** Texto do lembrete: a ofensiva em jogo quando existe; senão um convite curto. */
export function reminderMessage(streak: number): { title: string; body: string } {
  if (streak > 0) {
    return {
      title: `Sua ofensiva de ${streak} ${streak === 1 ? "dia" : "dias"} está esperando`,
      body: "Um texto curto já conta para a meta de hoje.",
    };
  }
  return { title: "Hora da leitura", body: "Que tal um texto curto em inglês agora?" };
}

export function parseReminder(raw: string | null): ReminderTime {
  return REMINDER_OPTIONS.some((o) => o.value === raw) ? (raw as ReminderTime) : DEFAULT_REMINDER;
}

export async function getReminder(): Promise<ReminderTime> {
  try {
    return parseReminder(await SecureStore.getItemAsync(STORAGE_KEY));
  } catch {
    return DEFAULT_REMINDER;
  }
}

/** Salva a escolha. Ligar pede a permissão do sistema; negada, guarda "off" e devolve false. */
export async function setReminder(time: ReminderTime): Promise<boolean> {
  const Notifications = notifications();
  if (!Notifications) return false;
  let granted = true;
  if (time !== "off") {
    const current = await Notifications.getPermissionsAsync();
    granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  }
  const value = granted ? time : "off";
  await SecureStore.setItemAsync(STORAGE_KEY, value);
  if (value === "off") await Notifications.cancelAllScheduledNotificationsAsync();
  return granted;
}

/** Cancela os lembretes agendados (logout): a mensagem traz a ofensiva da conta que saiu.
 * A escolha de horário fica no aparelho; a próxima conta reagenda ao abrir o Início. */
export async function cancelReminders(): Promise<void> {
  const Notifications = notifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    if (__DEV__) console.warn("Lembretes não cancelados:", e);
  }
}

/** Reagenda os lembretes a partir do estado de hoje (chamado ao abrir o Início). Sem permissão ou
 * desligado, só limpa. Erros não chegam à tela: lembrete é bônus, não pode quebrar o app. */
export async function syncReminders(goalMetToday: boolean, streak: number): Promise<void> {
  const Notifications = notifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const time = await getReminder();
    if (time === "off" || !(await Notifications.getPermissionsAsync()).granted) return;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Lembrete de leitura",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const content = reminderMessage(streak);
    for (const date of reminderDates(time, new Date(), goalMetToday)) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch (e) {
    if (__DEV__) console.warn("Lembretes não reagendados:", e);
  }
}
