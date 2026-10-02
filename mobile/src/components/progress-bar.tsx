import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";

import { durations } from "@/lib/motion";
import { colors, radius } from "@/theme";

type Props = {
  value: number;
  tone?: "primary" | "success";
  size?: "default" | "thin" | "large";
  /** enche a partir do zero ao aparecer (tela de conclusão, meta) */
  fromZero?: boolean;
};

// enche desacelerando (Material "emphasized decelerate")
const FILL_EASING = cubicBezier(0.05, 0.7, 0.1, 1);

/** Barra de progresso; mudanças de valor deslizam em ~600 ms (instantâneo com "reduzir movimento"). */
export function ProgressBar({ value, tone = "primary", size = "default", fromZero = false }: Props) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(fromZero && !reduceMotion ? 0 : percent);

  useEffect(() => {
    // próximo quadro: a barra já existe com o valor antigo e a transição tem de onde partir
    const frame = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  return (
    <View
      style={[styles.track, size !== "default" && styles[size]]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Animated.View
        style={[
          styles.fill,
          size !== "default" && styles[size],
          {
            width: `${shown}%`,
            backgroundColor: tone === "success" ? colors.success500 : colors.primary500,
            transitionProperty: "width",
            transitionDuration: reduceMotion ? 0 : durations.progress,
            transitionTimingFunction: FILL_EASING,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radius.sm, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.sm },
  // leitor: barra discreta; raio = metade da altura, como no default
  thin: { height: 4, borderRadius: 2 },
  // meta diária: barra mais presente
  large: { height: 12, borderRadius: 6 },
});
