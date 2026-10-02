import { useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { durations } from "@/lib/motion";
import { colors } from "@/theme";

// cores da celebração: marca, recompensa, ofensiva e meta (os papéis do design system)
const PALETTE = [colors.primary500, colors.gold600, colors.streak, colors.success500, colors.primary200];
const COUNT = 36;

type Piece = {
  x: number; // 0–1 da largura
  drift: number; // desvio lateral em px
  spin: number; // voltas em graus
  delay: number;
  duration: number;
  color: string;
  width: number;
  height: number;
};

function makePieces(random: () => number): Piece[] {
  return Array.from({ length: COUNT }, (_, i) => ({
    x: random(),
    drift: (random() - 0.5) * 120,
    spin: (random() - 0.5) * 720,
    delay: random() * 250,
    duration: durations.celebrate * (0.85 + random() * 0.35),
    color: PALETTE[i % PALETTE.length],
    width: 6 + random() * 4,
    height: 10 + random() * 6,
  }));
}

type Props = {
  /** dispara quando vira true (uma vez por montagem) */
  active: boolean;
  /** false com "reduzir movimento": nada cai (o resto da tela já celebra) */
  animate: boolean;
  /** injetável para testes */
  random?: () => number;
};

/**
 * Confete leve (~36 peças, só transform/opacity na UI thread) para eventos raros: meta batida e
 * marcos de ofensiva. Não bloqueia toques e some sozinho em ~1,8 s.
 */
export function Confetti({ active, animate, random = Math.random }: Props) {
  const [pieces] = useState(() => makePieces(random));
  if (!active || !animate) return null;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID="confetti"
    >
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece }: { piece: Piece }) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(
      withDelay(
        piece.delay,
        withTiming(1, { duration: piece.duration, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [t, piece]);

  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25,
      transform: [
        { translateX: piece.drift * p },
        { translateY: -24 + p * height * 0.75 },
        { rotate: `${piece.spin * p}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: piece.x * width,
          width: piece.width,
          height: piece.height,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: { position: "absolute", top: 0, borderRadius: 2 },
});
