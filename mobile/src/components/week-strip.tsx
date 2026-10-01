import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { weekday } from "@/lib/format";
import type { DailyStat } from "@/lib/stats";
import { colors, compactFontScale, fontFamily, spacing } from "@/theme";

const CIRCLE = 32;

// Os 7 dias até hoje (o último da lista é hoje). Estado nunca só pela cor: cumprido tem check;
// hoje pendente é tracejado; dia sem meta é um círculo cinza vazio.
export function WeekStrip({ days }: { days: DailyStat[] }) {
  const today = days[days.length - 1];
  const met = days.filter((d) => d.goal_met).length;
  const label =
    `Últimos ${days.length} dias: meta cumprida em ${met}; ` +
    (today?.goal_met ? "hoje cumprida" : "hoje pendente");

  return (
    <View style={styles.strip} accessible accessibilityLabel={label}>
      {days.map((d, i) => {
        const isToday = i === days.length - 1;
        return (
          <View key={d.day} style={styles.column} testID={`day-${d.day}`}>
            <AppText
              variant="caption"
              // textSecondary sobre streak50 daria 4.48:1 (abaixo de AA): letras em textPrimary
              color={isToday ? "primary600" : "textPrimary"}
              style={isToday && styles.today}
              maxFontSizeMultiplier={compactFontScale}
            >
              {weekday(d.day).letter}
            </AppText>
            <View
              testID={d.goal_met ? "day-met" : isToday ? "day-pending" : "day-missed"}
              style={[
                styles.circle,
                d.goal_met ? styles.met : isToday ? styles.pending : styles.missed,
              ]}
            >
              {d.goal_met && <Ionicons name="checkmark" size={18} color={colors.surface} />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", justifyContent: "space-between" },
  column: { alignItems: "center", gap: spacing.xs },
  today: { fontFamily: fontFamily.bold },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  met: { backgroundColor: colors.success600 },
  pending: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.primary500,
  },
  // surfaceMuted sobre streak50 quase some (1.03:1): a borda dá o contorno do dia
  missed: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
});
