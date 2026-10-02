import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Háptica pouca e sincronizada com o visual (plan.txt §3). No Android, as constantes do sistema
// (sem permissão VIBRATE). Nunca é o único sinal: aparelho sem motor ou em economia ignora.
const android = Platform.OS === "android";
const ignore = () => {};

export const haptic = {
  /** troca de aba, chip, seleção */
  select: () =>
    void (android
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync()
    ).catch(ignore),
  /** ação confirmada (salvar palavra) */
  tap: () =>
    void (android
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    ).catch(ignore),
  /** segurar para traduzir a frase */
  hold: () =>
    void (android
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ).catch(ignore),
  /** vitória: meta batida, acerto na revisão, junto da animação */
  success: () =>
    void (android
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ).catch(ignore),
};
