import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { useReduceMotion } from "@/lib/use-reduce-motion";
import { colors, motion, radius } from "@/theme";

type Props = { value: number; tone?: "primary" | "success"; size?: "default" | "thin" | "large" };

// A barra enche suave até o valor novo (transição CSS do Reanimated); com "reduzir movimento"
// (ou ainda desconhecido) troca direto.
export function ProgressBar({ value, tone = "primary", size = "default" }: Props) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const reduceMotion = useReduceMotion();

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
            width: `${percent}%`,
            backgroundColor: tone === "success" ? colors.success500 : colors.primary500,
            transitionProperty: ["width", "backgroundColor"],
            transitionDuration: reduceMotion === false ? motion.progress : 0,
            transitionTimingFunction: "ease-out",
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
