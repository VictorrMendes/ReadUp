import { Image, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { WeekStrip } from "@/components/week-strip";
import { formatDays } from "@/lib/format";
import type { DailyStat } from "@/lib/stats";
import { colors, radius, spacing } from "@/theme";

type Props = {
  current: number;
  longest: number;
  activeToday: boolean;
  week?: DailyStat[]; // os 7 dias até hoje (GET /stats/daily); sem ele, só a linha de cima
};

/** Legenda da ofensiva: positiva, nunca de culpa (design-v3). */
export function streakCaption(current: number, longest: number, activeToday: boolean): string {
  if (current === 0 && longest > 0) return `Recomece hoje · recorde de ${formatDays(longest)} salvo`;
  return activeToday ? "de ofensiva · mantida hoje" : "de ofensiva · leia hoje para manter";
}

// Ofensiva com a semana visível. O laranja fica no fundo claro, na chama e no texto streak700
// (4.88:1 sobre streak50); o número em textPrimary.
export function StreakCard({ current, longest, activeToday, week }: Props) {
  const caption = streakCaption(current, longest, activeToday);

  return (
    <View style={styles.card}>
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`Ofensiva de ${formatDays(current)}. ${caption}`}
      >
        <Image
          source={
            activeToday
              ? require("../../assets/images/streak.png")
              : require("../../assets/images/streak-inactive.png")
          }
          style={styles.image}
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <View style={styles.text}>
          <AppText variant="h2">{formatDays(current)}</AppText>
          <AppText variant="small" color="streak700">
            {caption}
          </AppText>
        </View>
      </View>
      {week && week.length > 0 && (
        <View style={styles.week}>
          <WeekStrip days={week} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    backgroundColor: colors.streak50,
    borderColor: colors.streak100,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  image: { width: 40, height: 40 },
  text: { flex: 1 },
  week: { marginTop: spacing.lg },
});
