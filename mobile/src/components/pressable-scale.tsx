import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { durations, springs } from "@/lib/motion";

// propriedades de layout ficam no invólucro animado (é ele que está no fluxo do pai)
const LAYOUT_KEYS = new Set<string>([
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
  "marginStart",
  "marginEnd",
  "alignSelf",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "width",
  "minWidth",
  "maxWidth",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "zIndex",
]);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  /** quanto encolhe ao tocar (cards grandes encolhem menos) */
  scaleTo?: number;
};

function split(style: StyleProp<ViewStyle>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) (LAYOUT_KEYS.has(key) ? outer : inner)[key] = value;
  // invólucro que estica (flex/largura) leva o conteúdo junto
  if (outer.flex !== undefined || outer.flexGrow !== undefined) inner.flexGrow = 1;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

/**
 * Pressable que encolhe de leve ao tocar e volta com mola (feedback imediato, ~100 ms). Mesmo
 * contrato do Pressable, inclusive `style` como função de `pressed` (cor de pressionado).
 * Com "reduzir movimento", não escala: fica só a mudança de cor de quem usa.
 */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, disabled, ...props }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const layout = split(typeof style === "function" ? style({ pressed: false, hovered: false }) : style).outer;

  function pressIn(event: GestureResponderEvent) {
    if (!reduceMotion && !disabled) scale.set(withTiming(scaleTo, { duration: durations.press }));
    onPressIn?.(event);
  }
  function pressOut(event: GestureResponderEvent) {
    if (!reduceMotion) scale.set(withSpring(1, springs.press));
    onPressOut?.(event);
  }

  return (
    <Animated.View style={[layout, animated]}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={(state) => split(typeof style === "function" ? style(state) : style).inner}
      />
    </Animated.View>
  );
}
