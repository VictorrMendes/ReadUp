import { useState } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

// Pressable que afunda ao tocar (~90 ms) e volta com mola. A cor de pressed continua com quem usa
// (style em função); com "reduzir movimento" o Reanimated pula a escala e sobra a cor.
export function PressableScale({ style, onPressIn, onPressOut, ...props }: Props) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        setPressed(true);
        scale.set(withTiming(motion.pressScale, { duration: motion.press }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        scale.set(withSpring(1, motion.release));
        onPressOut?.(e);
      }}
      style={[typeof style === "function" ? style({ pressed }) : style, animatedStyle]}
    />
  );
}
