import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { achievementIcon } from "@/components/achievement-badge";
import { AppText } from "@/components/app-text";
import { remainingLabel, type Achievement } from "@/lib/achievements";
import { colors, fontFamily, radius, spacing } from "@/theme";

// A conquista bloqueada mais perto de sair (Zeigarnik + goal gradient). Dourado = recompensa:
// medalha gold100 com borda gold600, textos gold700 (4.84:1 sobre gold50).
export function NextAchievementCard({ achievement: a }: { achievement: Achievement }) {
  const remaining = remainingLabel(a);
  const fraction = Math.min(1, a.current / a.target);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Próxima conquista: ${a.title}, ${remaining}`}
    >
      <View style={styles.medal}>
        <Ionicons name={achievementIcon(a.icon)} size={22} color={colors.gold700} />
      </View>
      <View style={styles.text}>
        <AppText variant="overline" color="gold700">
          Próxima conquista
        </AppText>
        <AppText variant="small" style={styles.title}>
          {a.title}
        </AppText>
        <View style={styles.row}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
          </View>
          <AppText variant="caption" color="gold700" style={styles.title}>
            {remaining}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    backgroundColor: colors.gold50,
    borderColor: colors.gold100,
  },
  medal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.gold600,
    backgroundColor: colors.gold100,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fontFamily.semibold },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.gold200, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: colors.gold600 },
});
