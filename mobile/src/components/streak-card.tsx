import { Image, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { formatDays } from "@/lib/format";
import { spacing } from "@/theme";

type Props = { current: number; longest: number; activeToday: boolean };

// Ofensiva numa linha. O laranja fica só na imagem (texto laranja sobre claro não passa
// contraste); o estado também está na legenda, não só na imagem.
export function StreakCard({ current, longest, activeToday }: Props) {
  const caption = activeToday
    ? "Ofensiva mantida hoje"
    : current > 0
      ? "Cumpra a meta de hoje para manter"
      : "Cumpra a meta de hoje para começar";
  const record = longest > current ? `Recorde: ${formatDays(longest)}` : null;

  return (
    <Card
      style={styles.card}
      accessible
      accessibilityLabel={[`Ofensiva de ${formatDays(current)}`, caption, record]
        .filter(Boolean)
        .join(". ")}
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
        <View style={styles.row}>
          <AppText variant="h3">{formatDays(current)}</AppText>
          {record && (
            <AppText variant="caption" color="textSecondary">
              {record}
            </AppText>
          )}
        </View>
        <AppText variant="small" color="textSecondary">
          {caption}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  image: { width: 32, height: 32 },
  text: { flex: 1 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    columnGap: spacing.sm,
  },
});
