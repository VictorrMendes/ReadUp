import { useContext, useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { springs } from "@/lib/motion";
import { colors, radius, spacing } from "@/theme";

type Props = { visible: boolean; onClose: () => void; children: ReactNode };

const RISE = 48; // quanto o painel sobe ao entrar
const CLOSE_DRAG = 100; // arrastar além disso (ou rápido para baixo) fecha
const CLOSE_VELOCITY = 800;
const EXIT_MS = 150;

// Painel que sobe de baixo (mola) sobre um fundo escurecido. Fecha ao tocar no fundo, no voltar
// do Android ou arrastando para baixo; sai com fade + descida antes de desmontar. Com "reduzir
// movimento", o Reanimated pula as animações (aparece e some direto).
export function BottomSheet({ visible, onClose, children }: Props) {
  const insets = useContext(SafeAreaInsetsContext);
  // continua montado durante a saída; desmonta quando ela termina
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const entrance = useSharedValue(0); // 0 fechado, 1 aberto
  const drag = useSharedValue(0); // deslocamento do arrasto (px, só para baixo)

  useEffect(() => {
    if (visible) {
      drag.set(0);
      entrance.set(withSpring(1, springs.sheet));
    } else {
      const exit = { duration: EXIT_MS, easing: Easing.in(Easing.cubic) };
      entrance.set(
        withTiming(0, exit, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, entrance, drag]);

  const pan = Gesture.Pan()
    .activeOffsetY(10) // toque e rolagem curta continuam com os botões do painel
    .onUpdate((e) => {
      drag.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DRAG || e.velocityY > CLOSE_VELOCITY) scheduleOnRN(onClose);
      else drag.set(withSpring(0, { ...springs.sheet, velocity: e.velocityY }));
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, entrance.get()) * interpolate(drag.get(), [0, 300], [1, 0.3], "clamp"),
  }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, entrance.get()),
    transform: [{ translateY: (1 - entrance.get()) * RISE + drag.get() }],
  }));

  return (
    <Modal
      testID="bottom-sheet"
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* o Modal é outra raiz nativa: o gesto precisa da própria GestureHandlerRootView */}
      <GestureHandlerRootView style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={[styles.panel, { paddingBottom: (insets?.bottom ?? 0) + spacing.xl }, panelStyle]}
          >
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: colors.overlay },
  panel: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  // alça: sinal visual de que o painel arrasta
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
});
