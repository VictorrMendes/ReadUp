import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { durations, easings } from "@/lib/motion";
import { colors } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** fração inicial (0–1): o progresso de antes desta sessão */
  from?: number;
  /** fração final (0–1) */
  to: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  /** false: já desenha no valor final (reduzir movimento, sequência pulada) */
  animate?: boolean;
  delay?: number;
  duration?: number;
  /** conteúdo no centro do anel (número, ícone) */
  children?: ReactNode;
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Anel de progresso da meta (gradiente de meta: ver o quanto falta puxa para completar).
 * Enche de `from` até `to` desacelerando; decorativo para leitor de tela (quem usa descreve).
 */
export function GoalRing({
  from = 0,
  to,
  size = 72,
  strokeWidth = 8,
  color = colors.primary500,
  animate = true,
  delay = 0,
  duration = durations.progress,
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(animate ? clamp(from) : clamp(to));

  useEffect(() => {
    progress.set(
      animate
        ? withDelay(delay, withTiming(clamp(to), { duration, easing: easings.enter }))
        : clamp(to),
    );
  }, [progress, to, animate, delay, duration]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <View
      style={{ width: size, height: size }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID="goal-ring"
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          // começa no topo (12h) e enche no sentido horário
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children && <View style={styles.center}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
