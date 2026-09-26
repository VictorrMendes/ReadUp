import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, spacing } from "@/theme";

type Props = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
};

export function EmptyState({ icon, title, message }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.textSecondary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.h3,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  message: { fontSize: fontSize.body, color: colors.textSecondary, textAlign: "center" },
});
