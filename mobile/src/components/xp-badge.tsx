import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { formatNumber } from "@/lib/format";
import { colors, compactFontScale, fontFamily, radius, spacing } from "@/theme";

type Props = { xp: number; gain?: boolean };

// XP total ou, com `gain`, o ganho ("+N XP"). Tom primary: o laranja é exclusivo da ofensiva.
// primary600 sobre primary100 dá 5.49:1 (AA).
export function XPBadge({ xp, gain = false }: Props) {
  const amount = formatNumber(xp);
  return (
    <View
      style={styles.pill}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${gain ? "Mais " : ""}${amount} pontos de experiência`}
    >
      <Ionicons name="flash" size={14} color={colors.primary600} />
      <AppText
        variant="small"
        color="primary600"
        style={styles.label}
        maxFontSizeMultiplier={compactFontScale}
      >
        {`${gain ? "+" : ""}${amount} XP`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    backgroundColor: colors.primary100,
  },
  label: { fontFamily: fontFamily.semibold },
});
