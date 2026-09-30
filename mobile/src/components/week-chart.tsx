import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { formatDays, formatNumber, weekday } from "@/lib/format";
import type { DailyStat } from "@/lib/stats";
import { colors, compactFontScale, radius, spacing } from "@/theme";

export const MAX_BAR_HEIGHT = 96;
const EMPTY_BAR_HEIGHT = 4; // dia sem leitura: traço mínimo, não some do eixo
const CHECK_SIZE = 12;

// Barras das palavras lidas por dia, do mais antigo para hoje. Dia com meta cumprida: barra
// success600 com um check acima (não depende só da cor); demais: primary500.
export function WeekChart({ days }: { days: DailyStat[] }) {
  const max = Math.max(0, ...days.map((d) => d.words_read));
  const total = days.reduce((sum, d) => sum + d.words_read, 0);
  const goalDays = days.filter((d) => d.goal_met).length;
  const summary =
    `Últimos ${days.length} dias: ${formatNumber(total)} palavras no total; ` +
    `meta cumprida em ${formatDays(goalDays)}`;

  return (
    <Card style={styles.card}>
      <View accessible accessibilityRole="header" accessibilityLabel={summary}>
        <AppText variant="h3">Últimos {days.length} dias</AppText>
      </View>
      <View style={styles.chart}>
        {days.map((d) => {
          const { name, letter } = weekday(d.day);
          const height =
            d.words_read > 0
              ? Math.max(EMPTY_BAR_HEIGHT, Math.round((d.words_read / max) * MAX_BAR_HEIGHT))
              : EMPTY_BAR_HEIGHT;
          const label =
            `${name}, ${formatNumber(d.words_read)} ${d.words_read === 1 ? "palavra" : "palavras"}` +
            (d.goal_met ? ", meta cumprida" : "");
          return (
            <View key={d.day} style={styles.column} accessible accessibilityLabel={label}>
              <View style={styles.plot}>
                {d.goal_met && (
                  <Ionicons
                    testID={`check-${d.day}`}
                    name="checkmark-circle"
                    size={CHECK_SIZE}
                    color={colors.success600}
                  />
                )}
                <View
                  testID={`bar-${d.day}`}
                  style={[
                    styles.bar,
                    { height },
                    d.words_read === 0
                      ? styles.empty
                      : d.goal_met
                        ? styles.goal
                        : styles.regular,
                  ]}
                />
              </View>
              <AppText
                variant="caption"
                color="textSecondary"
                maxFontSizeMultiplier={compactFontScale}
              >
                {letter}
              </AppText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  chart: { flexDirection: "row", gap: spacing.sm },
  column: { flex: 1, alignItems: "center", gap: spacing.xs },
  // altura fixa: barras alinhadas pela base, com espaço para o check acima da maior
  plot: {
    height: MAX_BAR_HEIGHT + CHECK_SIZE + spacing.xs,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  bar: {
    width: "70%",
    maxWidth: 28,
    borderTopLeftRadius: radius.sm / 2,
    borderTopRightRadius: radius.sm / 2,
  },
  regular: { backgroundColor: colors.primary500 },
  goal: { backgroundColor: colors.success600 },
  empty: { backgroundColor: colors.border },
});
