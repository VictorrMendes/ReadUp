import { useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotion } from "@/lib/use-reduce-motion";
import { colors, motion } from "@/theme";

// marca, recompensa, ofensiva e meta (papéis do design system)
const PALETTE = [colors.primary500, colors.gold600, colors.streak, colors.success500, colors.primary200];
const COUNT = 36; // até ~40 views animadas fica leve até em Android de entrada (plan.txt §6)
const GRAVITY = 1100;

type Piece = { vx: number; vy: number; spin: number; delay: number; color: string; w: number };

function PieceView({ piece }: { piece: Piece }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withDelay(piece.delay, withTiming(1, { duration: motion.celebrate, easing: Easing.linear })),
    );
  }, [t, piece.delay]);

  const style = useAnimatedStyle(() => {
    const s = t.get();
    return {
      opacity: interpolate(s, [0, 0.75, 1], [1, 1, 0]),
      transform: [
        { translateX: piece.vx * s },
        { translateY: piece.vy * s + GRAVITY * s * s }, // sobe e cai (parábola)
        { rotate: `${piece.spin * s}deg` },
        { rotateX: `${piece.spin * 0.5 * s}deg` }, // papel girando
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: piece.w, height: piece.w * 1.6, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

// Confete leve (só Reanimated) para evento raro: a meta do dia batida. Não recebe toques e some em
// ~1,6 s; com "reduzir movimento" (ou ainda desconhecido) não aparece.
export function Confetti() {
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      vx: (Math.random() - 0.5) * width * 0.9,
      vy: -(500 + Math.random() * 300),
      spin: (Math.random() - 0.5) * 1080,
      delay: Math.random() * 120,
      color: PALETTE[i % PALETTE.length],
      w: 6 + Math.random() * 6,
    })),
  );

  if (reduceMotion !== false) return null;
  return (
    <View
      testID="confetti"
      style={styles.layer}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pieces.map((piece, i) => (
        <PieceView key={i} piece={piece} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  piece: { position: "absolute", borderRadius: 2 },
});
