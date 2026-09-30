import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { colors, spacing } from "@/theme";

type Props = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
  // ilustração de 120dp no lugar do ícone
  illustration?: ImageSourcePropType;
  // próximo passo sugerido
  action?: { label: string; onPress: () => void; loading?: boolean };
};

export function EmptyState({ icon, title, message, illustration, action }: Props) {
  return (
    <View style={styles.container}>
      {illustration ? (
        <Image
          source={illustration}
          style={styles.illustration}
          accessibilityIgnoresInvertColors
          accessible={false}
        />
      ) : (
        <Ionicons name={icon} size={48} color={colors.textSecondary} />
      )}
      <AppText variant="h3" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      <AppText color="textSecondary" style={styles.center}>
        {message}
      </AppText>
      {action && (
        <Button
          variant="secondary"
          title={action.label}
          onPress={action.onPress}
          loading={action.loading}
          style={styles.action}
        />
      )}
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
  illustration: { width: 120, height: 120 },
  title: { textAlign: "center", marginTop: spacing.sm },
  center: { textAlign: "center" },
  action: { marginTop: spacing.md },
});
