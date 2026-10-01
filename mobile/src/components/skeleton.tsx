import { useEffect, useState } from "react";
import {
  Animated,
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useReduceMotion } from "@/lib/use-reduce-motion";
import { colors, radius } from "@/theme";

type Props = { height: DimensionValue; width?: DimensionValue; style?: StyleProp<ViewStyle> };

// Bloco de carregamento que guarda o espaço do conteúdo. Pulsa (opacity 0.5↔1), exceto com
// "reduzir movimento" ligado. Decorativo: quem o usa anuncia "Carregando".
export function Skeleton({ height, width = "100%", style }: Props) {
  const [opacity] = useState(() => new Animated.Value(1));
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion !== false) return; // ligado ou ainda desconhecido: sem pulso
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.block, { height, width, opacity: reduceMotion === false ? opacity : 1 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border, borderRadius: radius.card },
});
