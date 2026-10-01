import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { achievementUnit, type Achievement } from "@/lib/achievements";
import { formatNumber } from "@/lib/format";
import { colors, compactFontScale, fontFamily, radius, spacing } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

// o ícone vem do backend como texto: nome desconhecido cai numa medalha genérica
export function achievementIcon(name: string): IconName {
  return name in Ionicons.glyphMap ? (name as IconName) : "ribbon-outline";
}

type Props = {
  achievement: Pick<Achievement, "id" | "title" | "icon" | "target" | "current" | "unlocked">;
};

// Medalha compacta. O estado não depende só da cor: bloqueada mostra cadeado e progresso;
// desbloqueada, check e "Desbloqueada". Desbloqueada em dourado (recompensa): medalha gold100 com
// borda gold600, ícone e texto gold700 (4.84:1 sobre gold50).
// ponytail: medalha de 56 com mini-selo de cadeado e grade de 3 colunas ficam para a onda 2.
export function AchievementBadge({ achievement: a }: Props) {
  const unit = achievementUnit(a.id, a.target);
  const label = a.unlocked
    ? `${a.title}, desbloqueada`
    : `${a.title}, bloqueada, ${formatNumber(a.current)} de ${formatNumber(a.target)} ${unit}`;

  return (
    <View
      style={[styles.badge, a.unlocked ? styles.unlocked : styles.locked]}
      accessible
      accessibilityLabel={label}
    >
      <View style={[styles.circle, a.unlocked ? styles.circleUnlocked : styles.circleLocked]}>
        <Ionicons
          name={achievementIcon(a.icon)}
          size={20}
          color={a.unlocked ? colors.gold700 : colors.textSecondary}
        />
      </View>
      <AppText variant="small" style={styles.title} maxFontSizeMultiplier={compactFontScale}>
        {a.title}
      </AppText>
      <View style={styles.status}>
        <Ionicons
          name={a.unlocked ? "checkmark-circle" : "lock-closed"}
          size={12}
          color={a.unlocked ? colors.gold700 : colors.textSecondary}
        />
        <AppText
          variant="caption"
          color={a.unlocked ? "gold700" : "textSecondary"}
          maxFontSizeMultiplier={compactFontScale}
        >
          {a.unlocked
            ? "Desbloqueada"
            : `${formatNumber(a.current)} / ${formatNumber(a.target)}`}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  unlocked: { backgroundColor: colors.gold50, borderColor: colors.gold200 },
  locked: { backgroundColor: colors.background, borderColor: colors.border },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  circleUnlocked: { backgroundColor: colors.gold100, borderColor: colors.gold600 },
  circleLocked: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  title: { fontFamily: fontFamily.semibold },
  status: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
