import { useContext, useEffect, useState, type ReactNode } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useReduceMotion } from "@/lib/use-reduce-motion";
import { colors, motion, radius, spacing } from "@/theme";

type Props = { visible: boolean; onClose: () => void; children: ReactNode };

const RISE = 48; // quanto o painel sobe ao entrar

// Painel que sobe de baixo sobre um fundo escurecido; fecha ao tocar no fundo ou no voltar do
// Android. Entra com fade + subida, exceto com "reduzir movimento" ligado.
// ponytail: sem arrastar para fechar e sem animação de saída; trocar por um sheet com gesto
// quando o app tiver react-native-gesture-handler.
export function BottomSheet({ visible, onClose, children }: Props) {
  const insets = useContext(SafeAreaInsetsContext);
  const [entrance] = useState(() => new Animated.Value(0));
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!visible || reduceMotion === null) return;
    if (reduceMotion) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 250,
      easing: motion.easing,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, entrance, reduceMotion]);

  return (
    <Modal
      testID="bottom-sheet"
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: entrance }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[
            styles.panel,
            {
              paddingBottom: (insets?.bottom ?? 0) + spacing.xl,
              opacity: entrance,
              transform: [
                { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] }) },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: colors.overlay },
  panel: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
});
