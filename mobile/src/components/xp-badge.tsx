import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { formatNumber } from "@/lib/format";
import { colors, compactFontScale, fontFamily, radius, spacing } from "@/theme";

// onHero: pill branca sobre o herói azul do Início (o "XPChip" da nota design-v3)
type Props = { xp: number; gain?: boolean; onHero?: boolean };

// XP total ou, com `gain`, o ganho ("+N XP"). Dourado = recompensa (o laranja é só da ofensiva):
// ícone gold600 e texto gold700, 4.51:1 sobre gold100 e 5.02:1 sobre surface.
export function XPBadge({ xp, gain = false, onHero = false }: Props) {
  const amount = formatNumber(xp);
  return (
    <View
      style={[styles.pill, onHero ? styles.hero : styles.gold]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${gain ? "Mais " : ""}${amount} pontos de experiência`}
    >
      <Ionicons name="flash" size={onHero ? 16 : 14} color={colors.gold600} />
      <AppText
        variant="small"
        color="gold700"
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
    borderRadius: radius.pill,
  },
  gold: { backgroundColor: colors.gold100 },
  // herói do Início: altura 32, fundo branco (branco translúcido daria 3.45:1)
  hero: { height: 32, backgroundColor: colors.surface, paddingVertical: 0 },
  label: { fontFamily: fontFamily.semibold },
});
