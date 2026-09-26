import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppText } from "@/components/app-text";
import { colors, fontFamily, radius, spacing, touchTarget, type ColorToken } from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANTS: Record<
  Variant,
  { background?: ColorToken; pressed?: ColorToken; border?: ColorToken; text: ColorToken }
> = {
  primary: { background: "primary500", pressed: "primary600", text: "surface" },
  secondary: { background: "surface", pressed: "background", border: "border", text: "textPrimary" },
  ghost: { pressed: "primary100", text: "primary500" },
  destructive: { background: "error", text: "surface" },
};

type Props = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}: Props) {
  const v = VARIANTS[variant];
  const inactive = !!disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      disabled={inactive}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => {
        const background = pressed ? (v.pressed ?? v.background) : v.background;
        return [
          styles.base,
          background && { backgroundColor: colors[background] },
          v.border && { borderWidth: 1, borderColor: colors[v.border] },
          pressed && !v.pressed && styles.pressed,
          inactive && styles.inactive,
          style,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.text]} />
      ) : (
        <AppText color={v.text} style={styles.label}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  label: { fontFamily: fontFamily.semibold },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.6 },
});
