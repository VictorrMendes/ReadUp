import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, type ComponentProps } from "react";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { springs } from "@/lib/motion";

type Props = {
  name: ComponentProps<typeof Ionicons>["name"];
  color: ComponentProps<typeof Ionicons>["color"];
  size: number;
  focused: boolean;
};

/** Ícone da barra de abas: ao ser escolhido, cresce um pouco e assenta com mola (~300 ms). */
export function TabIcon({ name, color, size, focused }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const firstRender = useRef(true);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  useEffect(() => {
    // na abertura do app a aba inicial já vem escolhida: sem pulo
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (focused && !reduceMotion) {
      scale.set(withSequence(withTiming(1.18, { duration: 110 }), withSpring(1, springs.pop)));
    }
  }, [focused, reduceMotion, scale]);

  return (
    <Animated.View style={animated}>
      <Ionicons name={name} color={color} size={size} />
    </Animated.View>
  );
}
