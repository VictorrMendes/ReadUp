import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppText } from "@/components/app-text";
import { PressableScale } from "@/components/pressable-scale";
import {
  colors,
  fontFamily,
  radius,
  ripple,
  spacing,
  touchTarget,
  type ColorToken,
} from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANTS: Record<
  Variant,
  { background?: ColorToken; pressed?: ColorToken; border?: ColorToken; text: ColorToken }
> = {
  primary: { background: "primary500", pressed: "primary600", text: "surface" },
  secondary: { background: "surface", pressed: "background", border: "border", text: "textPrimary" },
  ghost: { pressed: "primary100", text: "primary500" },
  destructive: { background: "errorText", text: "surface" },
};

type Props = Omit<PressableProps, "children" | "style"> & {
  title: string;
  icon?: ComponentProps<typeof Ionicons>["name"]; // ícone antes do título (decorativo)
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  icon,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}: Props) {
  const v = VARIANTS[variant];
  const inactive = !!disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title} // o ícone é decorativo: o nome é só o título
      android_ripple={variant === "secondary" || variant === "ghost" ? ripple : undefined}
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
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={18} color={colors[v.text]} />}
          <AppText color={v.text} style={styles.label}>
            {title}
          </AppText>
        </View>
      )}
    </PressableScale>
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
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontFamily: fontFamily.semibold },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.6 },
});
