import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, compactFontScale, fontFamily, radius, spacing, touchTarget } from "@/theme";

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

// Seletor de seção no topo de uma tela (ex.: Para você · Notícias · Meus livros). Selecionado: fundo
// surface + texto em semibold primary700, para a seleção não depender só da cor.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.selected]}
          >
            <AppText
              variant="small"
              color={selected ? "primary700" : "textSecondary"}
              style={styles.label}
              numberOfLines={1}
              maxFontSizeMultiplier={compactFontScale}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: spacing.xs,
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  segment: {
    flex: 1,
    minHeight: touchTarget - spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  selected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontFamily: fontFamily.semibold },
});
