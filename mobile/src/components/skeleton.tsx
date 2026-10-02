import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, radius } from "@/theme";

type Props = { height: DimensionValue; width?: DimensionValue; style?: StyleProp<ViewStyle> };

const SWEEP_MS = 1300;
// faixa de brilho em fatias com opacidade crescente/decrescente: um degradê sem lib de gradiente
const SLICES = [0.12, 0.28, 0.42, 0.28, 0.12];

// Bloco de carregamento que guarda o espaço do conteúdo. Um brilho atravessa da esquerda para a
// direita (sinal de "está vindo"), exceto com "reduzir movimento". Decorativo: quem o usa anuncia
// "Carregando".
export function Skeleton({ height, width = "100%", style }: Props) {
  const reduceMotion = useReducedMotion();
  const [blockWidth, setBlockWidth] = useState(0);
  const sweep = useSharedValue(0);
  const band = blockWidth * 0.5;

  useEffect(() => {
    if (reduceMotion || blockWidth === 0) return;
    sweep.set(0);
    sweep.set(
      withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.ease) }), -1),
    );
    return () => cancelAnimation(sweep);
  }, [sweep, reduceMotion, blockWidth]);

  const shine = useAnimatedStyle(() => ({
    transform: [{ translateX: -band + sweep.get() * (blockWidth + band) }],
  }));

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(e: LayoutChangeEvent) => setBlockWidth(e.nativeEvent.layout.width)}
      style={[styles.block, { height, width }, style]}
    >
      {!reduceMotion && blockWidth > 0 && (
        <Animated.View style={[styles.shine, { width: band }, shine]}>
          {SLICES.map((opacity, i) => (
            <View key={i} style={[styles.slice, { opacity }]} />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border, borderRadius: radius.card, overflow: "hidden" },
  shine: { position: "absolute", top: 0, bottom: 0, left: 0, flexDirection: "row" },
  slice: { flex: 1, backgroundColor: colors.surface },
});
