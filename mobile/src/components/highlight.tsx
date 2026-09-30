import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, type TypographyVariant } from "@/theme";

type Props = { children: string; variant?: TypographyVariant };

// "Palavra grifada": o grifo do ícone do app atrás de uma palavra (identidade visual).
export function Highlight({ children, variant = "body" }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark} />
      <AppText variant={variant}>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "flex-start" },
  mark: {
    position: "absolute",
    left: -4,
    right: -4,
    bottom: "8%",
    height: "50%",
    borderRadius: 4,
    backgroundColor: colors.primary100,
    transform: [{ rotate: "-2deg" }],
  },
});
