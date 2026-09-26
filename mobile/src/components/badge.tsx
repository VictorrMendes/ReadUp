import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, fontFamily, radius, spacing, type ColorToken } from "@/theme";

type Tone = "neutral" | "primary" | "success" | "streak";

// Texto sempre escuro o bastante para contraste; success/streak não têm tom escuro no DS,
// então a cor aparece no fundo (success) ou só na borda (streak, com moderação).
const TONES: Record<Tone, { background: ColorToken; border: ColorToken; text: ColorToken }> = {
  neutral: { background: "background", border: "border", text: "textPrimary" },
  primary: { background: "primary100", border: "primary100", text: "primary600" },
  success: { background: "success100", border: "success100", text: "textPrimary" },
  streak: { background: "surface", border: "streak", text: "textPrimary" },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors[t.background], borderColor: colors[t.border] },
      ]}
    >
      <AppText variant="caption" color={t.text} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  label: { fontFamily: fontFamily.semibold },
});
