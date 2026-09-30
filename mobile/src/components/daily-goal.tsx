import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { ProgressBar } from "@/components/progress-bar";
import { formatNumber } from "@/lib/format";
import { colors, fontFamily, spacing } from "@/theme";

type Props = { target: number; wordsToday: number; remaining: number; completed: boolean };

export function DailyGoal({ target, wordsToday, remaining, completed }: Props) {
  const percent = Math.min(100, Math.floor((wordsToday / target) * 100));
  // textSecondary sobre success100 dá 4.33:1 (abaixo de AA); concluída usa texto escuro
  const secondary = completed ? "textPrimary" : "textSecondary";

  return (
    <Card
      style={[styles.card, completed && styles.done]}
      accessible
      accessibilityLabel={
        `Meta diária: ${formatNumber(wordsToday)} de ${formatNumber(target)} palavras, ${percent}%. ` +
        (completed ? "Meta de hoje cumprida" : `Faltam ${formatNumber(remaining)} palavras`)
      }
    >
      <View style={styles.row}>
        <AppText variant="small" color={secondary} style={styles.semibold}>
          Meta diária
        </AppText>
        <AppText variant="small" color={secondary} style={styles.semibold}>
          {percent}%
        </AppText>
      </View>
      <View style={styles.numbers}>
        <AppText variant="display">{formatNumber(wordsToday)}</AppText>
        <AppText color={secondary}>/ {formatNumber(target)} palavras</AppText>
      </View>
      <ProgressBar
        value={wordsToday / target}
        tone={completed ? "success" : "primary"}
        size="large"
      />
      <View style={styles.row}>
        {completed ? (
          <View style={styles.status}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success600} />
            <AppText variant="small" style={styles.semibold}>
              Meta de hoje cumprida
            </AppText>
          </View>
        ) : (
          <View style={styles.status}>
            <Ionicons name="book-outline" size={16} color={colors.textSecondary} />
            <AppText variant="small" color="textSecondary">
              Faltam {formatNumber(remaining)} palavras
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  done: { backgroundColor: colors.success100, borderColor: colors.success500 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  numbers: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  status: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  semibold: { fontFamily: fontFamily.semibold },
});
