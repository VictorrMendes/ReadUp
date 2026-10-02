import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { PressableScale } from "@/components/pressable-scale";
import { haptic } from "@/lib/haptics";
import type { Option } from "@/lib/preferences";
import { colors, fontFamily, radius, ripple, spacing, touchTarget } from "@/theme";

type Props<T> = {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

// Escolha única (nível, meta) como grupo de rádio. Selecionado: borda/fundo primary + check,
// para a seleção não depender só da cor.
export function OptionList<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: Props<T>) {
  return (
    // sem accessible no grupo: no iOS isso juntaria as opções num elemento só
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={String(option.value)}
            onPress={() => {
              if (!selected) haptic.select();
              onChange(option.value);
            }}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            accessibilityLabel={`${option.label}, ${option.description}`}
            android_ripple={ripple}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
            ]}
          >
            <View style={styles.text}>
              <AppText style={styles.label}>{option.label}</AppText>
              {/* sobre primary100, textSecondary cai para 3.9:1; primary600 dá 5.49:1 */}
              <AppText variant="small" color={selected ? "primary600" : "textSecondary"}>
                {option.description}
              </AppText>
            </View>
            {selected && <Ionicons name="checkmark-circle" size={24} color={colors.primary500} />}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  option: {
    minHeight: touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden", // ripple respeita o raio
  },
  selected: { borderColor: colors.primary500, backgroundColor: colors.primary100 },
  pressed: { backgroundColor: colors.background },
  text: { flex: 1, gap: spacing.xs },
  label: { fontFamily: fontFamily.semibold },
});
