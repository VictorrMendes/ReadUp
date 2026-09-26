import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, type PressableProps } from "react-native";

import { colors, radius, touchTarget, type ColorToken } from "@/theme";

type Props = Omit<PressableProps, "children" | "style" | "accessibilityLabel"> & {
  icon: ComponentProps<typeof Ionicons>["name"];
  // obrigatório: botão só com ícone precisa de nome para leitor de tela
  accessibilityLabel: string;
  color?: ColorToken;
};

export function IconButton({ icon, color = "textPrimary", ...props }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={24} color={colors[color]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.border },
});
