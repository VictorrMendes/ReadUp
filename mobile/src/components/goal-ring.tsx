import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { colors, motion } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const clamp = (n: number) => Math.min(1, Math.max(0, n));

type Props = {
  from?: number; // fração de antes (0–1): o anel começa aqui
  to: number;
  color: string;
  size?: number;
  stroke?: number;
  delay?: number;
  skipped?: boolean; // pula direto para `to`
  onFull?: () => void; // chamado quando o arco chega a 100% (não quando já começa cheio)
  children?: ReactNode; // centro do anel
};

// Anel da meta: enche de `from` até `to` desacelerando (M3 emphasized decelerate). Decorativo:
// quem usa descreve o valor para o leitor de tela. "Reduzir movimento": o Reanimated pula direto.
export function GoalRing({
  from = 0,
  to,
  color,
  size = 64,
  stroke = 8,
  delay = 0,
  skipped = false,
  onFull,
  children,
}: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(clamp(from));

  useEffect(() => {
    const target = clamp(to);
    const fill = withTiming(target, {
      duration: motion.ring,
      easing: Easing.bezier(0.05, 0.7, 0.1, 1),
    });
    progress.set(skipped ? target : withDelay(delay, fill));
  }, [to, delay, skipped, progress]);

  useAnimatedReaction(
    () => progress.get() >= 1,
    (full, wasFull) => {
      if (full && wasFull === false && onFull) scheduleOnRN(onFull);
    },
  );

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <View
      testID="goal-ring"
      style={{ width: size, height: size }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          fill="none"
          animatedProps={arcProps}
        />
      </Svg>
      {children && <View style={styles.center}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: "-90deg" }] }, // o arco começa no topo
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
});
