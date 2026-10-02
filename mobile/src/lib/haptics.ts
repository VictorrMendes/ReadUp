import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Háptica com parcimônia e sempre junto do visual (Apple HIG / Android haptics): só em momentos
// que significam algo. Tocar em botão comum não vibra; erro não vibra (nada de punição).
// Falha (aparelho sem motor, web) é ignorada: a háptica é bônus.

function safely(run: () => Promise<void>) {
  if (Platform.OS === "web") return;
  run().catch(() => {});
}

export const haptic = {
  /** Palavra salva, chip escolhido. */
  light: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Segurar para traduzir a frase. */
  medium: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Troca de seleção (opção, aba de filtro). */
  selection: () => safely(() => Haptics.selectionAsync()),
  /** Meta batida, ofensiva +1, acerto na revisão: junto da animação de celebração. */
  success: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
