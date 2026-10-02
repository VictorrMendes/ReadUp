import { useContext, useEffect, useState, type ReactNode } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useReduceMotion } from "@/lib/use-reduce-motion";
import { colors, radius, spacing } from "@/theme";

type Props = { visible: boolean; onClose: () => void; children: ReactNode };

const RISE = 72; // quanto o painel sobe ao entrar

// Painel que sobe de baixo sobre um fundo escurecido; fecha ao tocar no fundo ou no voltar do
// Android. Entra com fade + subida em mola, exceto com "reduzir movimento" ligado.
// ponytail: sem arrastar para fechar e sem animação de saída; trocar por um sheet com gesto
// quando o app tiver react-native-gesture-handler.
export function BottomSheet({ visible, onClose, children }: Props) {
  const insets = useContext(SafeAreaInsetsContext);
  const [entrance] = useState(() => new Animated.Value(0));
  const reduceMotion = useReduceMotion();
  // a mola passa um pouco de 1: a opacidade não acompanha a sobra
  const fade = entrance.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: "clamp" });

  useEffect(() => {
    if (!visible || reduceMotion === null) return;
    if (reduceMotion) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    // mola: o painel sobe e assenta com uma sobra mínima (parece físico, não "deslizado")
    const animation = Animated.spring(entrance, {
      toValue: 1,
      damping: 20,
      stiffness: 220,
      mass: 1,
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
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
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
              opacity: fade,
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
