import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { formatNumber } from "@/lib/format";
import { spacing } from "@/theme";

type Props = {
  value: number | string; // número vira pt-BR ("3.450"); texto vai como está ("2 / 1")
  label: string; // em minúsculas: também forma o rótulo acessível ("3.450 palavras lidas")
  icon?: ReactNode;
  accessibilityLabel?: string;
};

// Um número em destaque com o que ele mede.
export function StatTile({ value, label, icon, accessibilityLabel }: Props) {
  const shown = typeof value === "number" ? formatNumber(value) : value;
  return (
    <Card style={styles.tile} accessible accessibilityLabel={accessibilityLabel ?? `${shown} ${label}`}>
      <View style={styles.row}>
        {icon}
        <AppText variant="h2">{shown}</AppText>
      </View>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: spacing.xs, padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
