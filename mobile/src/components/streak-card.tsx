import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { WeekStrip } from "@/components/week-strip";
import { formatDays, formatNumber } from "@/lib/format";
import type { DailyStat } from "@/lib/stats";
import { colors, fontFamily, radius, spacing } from "@/theme";

type Props = {
  current: number;
  longest: number;
  activeToday: boolean; // mínimo do dia feito
  goalMetToday?: boolean; // meta batida: chama dourada
  freezes?: number; // escudos restantes
  wordsTotal?: number; // acumulado: aparece em destaque quando a ofensiva quebrou
  week?: DailyStat[]; // os 7 dias até hoje (GET /stats/daily); sem ele, só a linha de cima
};

/** Legenda da ofensiva: positiva, nunca de culpa (plan.txt §2 Ética). */
export function streakCaption(
  current: number,
  longest: number,
  activeToday: boolean,
  goalMetToday = false,
): string {
  if (current === 0 && longest > 0) {
    return `Acontece. Recomece hoje · recorde de ${formatDays(longest)} salvo`;
  }
  if (goalMetToday) return "de ofensiva · meta de hoje batida";
  return activeToday ? "de ofensiva · mantida hoje" : "de ofensiva · um texto curto hoje mantém";
}

export function freezesLabel(freezes: number): string {
  if (freezes === 0) return "Sem escudos: leia hoje para manter";
  return `${freezes} ${freezes === 1 ? "escudo" : "escudos"} · cobrem dias sem leitura`;
}

// Ofensiva com a semana visível. O laranja fica no fundo claro, na chama e no texto streak700
// (4.88:1 sobre streak50); o número em textPrimary. Meta batida: a chama ganha o halo dourado.
export function StreakCard({
  current,
  longest,
  activeToday,
  goalMetToday = false,
  freezes,
  wordsTotal,
  week,
}: Props) {
  const caption = streakCaption(current, longest, activeToday, goalMetToday);
  const broken = current === 0 && longest > 0;
  const showFreezes = freezes !== undefined && current > 0;
  const label = [
    `Ofensiva de ${formatDays(current)}. ${caption}`,
    showFreezes && freezesLabel(freezes),
    broken && wordsTotal ? `Você já leu ${formatNumber(wordsTotal)} palavras` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <View style={styles.card}>
      <View style={styles.row} accessible accessibilityLabel={label}>
        <View
          style={[styles.flame, goalMetToday && styles.goldFlame]}
          testID={goalMetToday ? "gold-flame" : undefined}
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
        </View>
        <View style={styles.text}>
          <AppText variant="h2">{formatDays(current)}</AppText>
          <AppText variant="small" color="streak700">
            {caption}
          </AppText>
          {showFreezes && (
            <View style={styles.freezes}>
              <Ionicons name="shield-checkmark" size={14} color={colors.streak700} />
              <AppText variant="caption" color="streak700">
                {freezesLabel(freezes)}
              </AppText>
            </View>
          )}
        </View>
      </View>
      {broken && wordsTotal ? (
        // ofensiva quebrada: o que nunca zera em destaque (autocompaixão, plan.txt §4.5)
        <AppText style={styles.total} importantForAccessibility="no">
          Você já leu <AppText style={styles.totalNumber}>{formatNumber(wordsTotal)}</AppText>{" "}
          palavras.
        </AppText>
      ) : null}
      {week && week.length > 0 && (
        <View style={styles.week}>
          <WeekStrip days={week} />
        </View>
      )}
    </View>
  );
}

const FLAME = 48;

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    backgroundColor: colors.streak50,
    borderColor: colors.streak100,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flame: {
    width: FLAME,
    height: FLAME,
    borderRadius: FLAME / 2,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  goldFlame: { backgroundColor: colors.gold100, borderColor: colors.gold600 },
  image: { width: 36, height: 36 },
  text: { flex: 1 },
  freezes: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  total: { marginTop: spacing.md },
  totalNumber: { fontFamily: fontFamily.bold, color: colors.textPrimary },
  week: { marginTop: spacing.lg },
});
