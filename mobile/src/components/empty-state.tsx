import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, spacing } from "@/theme";

type Props = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
};

export function EmptyState({ icon, title, message }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.textSecondary} />
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      <AppText color="textSecondary" style={styles.center}>
        {message}
      </AppText>
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
  title: { textAlign: "center", marginTop: spacing.sm },
  center: { textAlign: "center" },
});
