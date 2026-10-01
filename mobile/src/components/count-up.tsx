import { useEffect, useState } from "react";
import { Animated, type TextStyle } from "react-native";

import { AppText } from "@/components/app-text";
import { formatNumber } from "@/lib/format";
import { motion, type ColorToken, type TypographyVariant } from "@/theme";

type Props = {
  to: number;
  from?: number;
  prefix?: string;
  // null = "reduzir movimento" ainda desconhecido (espera); true = mostra o valor final direto
  reduceMotion: boolean | null;
  // pular a animação (toque na tela de conclusão): vai direto ao valor final
  skipped?: boolean;
  delay?: number;
  variant?: TypographyVariant;
  color?: ColorToken;
  style?: TextStyle;
};

// Número que conta de `from` até `to` (pt-BR). O leitor de tela lê o valor final, não os passos.
export function CountUp({
  to,
  from = 0,
  prefix = "",
  reduceMotion,
  skipped = false,
  delay = 0,
  variant = "stat",
  color,
  style,
}: Props) {
  const [value] = useState(() => new Animated.Value(from));
  const [shown, setShown] = useState(from);

  useEffect(() => {
    const id = value.addListener(({ value: v }) => setShown(Math.round(v)));
    return () => value.removeListener(id);
  }, [value]);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion || skipped) {
      value.stopAnimation();
      value.setValue(to);
      return;
    }
    const animation = Animated.timing(value, {
      toValue: to,
      duration: motion.count,
      delay,
      easing: motion.easing,
      useNativeDriver: false, // o número vai para o texto (JS), não para uma view nativa
    });
    animation.start();
    return () => animation.stop();
  }, [value, to, reduceMotion, skipped, delay]);

  return (
    <AppText
      variant={variant}
      color={color}
      style={style}
      accessibilityLabel={`${prefix}${formatNumber(to)}`}
    >
      {`${prefix}${formatNumber(shown)}`}
    </AppText>
  );
}
