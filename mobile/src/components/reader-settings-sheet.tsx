import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BottomSheet } from "@/components/bottom-sheet";
import { SegmentedControl } from "@/components/segmented-control";
import {
  FONT_SIZES,
  READER_THEMES,
  type ReaderFont,
  type ReaderSettings,
  type ReaderThemeName,
} from "@/lib/reader-settings";
import { colors, fontFamily, radius, spacing, touchTarget } from "@/theme";

type Props = {
  visible: boolean;
  settings: ReaderSettings;
  onChange: (change: Partial<ReaderSettings>) => void;
  onClose: () => void;
};

const FONTS: { value: ReaderFont; label: string }[] = [
  { value: "serif", label: "Serifa" },
  { value: "sans", label: "Sem serifa" },
];

// Painel "Aa" do leitor: tamanho do texto, fonte e tema. Cada mudança vale na hora.
export function ReaderSettingsSheet({ visible, settings, onChange, onClose }: Props) {
  const size = FONT_SIZES[settings.sizeIndex];
  const smallest = settings.sizeIndex === 0;
  const largest = settings.sizeIndex === FONT_SIZES.length - 1;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <AppText variant="h3" accessibilityRole="header">
          Aparência do texto
        </AppText>

        <View style={styles.row}>
          <AppText variant="small" color="textSecondary" style={styles.rowLabel}>
            Tamanho
          </AppText>
          <View style={styles.stepper}>
            <StepButton
              label="Diminuir texto"
              glyphSize={15}
              disabled={smallest}
              onPress={() => onChange({ sizeIndex: settings.sizeIndex - 1 })}
            />
            <AppText
              style={styles.sizeValue}
              accessibilityLabel={`Tamanho do texto: ${size}`}
              accessibilityLiveRegion="polite"
            >
              {size}
            </AppText>
            <StepButton
              label="Aumentar texto"
              glyphSize={22}
              disabled={largest}
              onPress={() => onChange({ sizeIndex: settings.sizeIndex + 1 })}
            />
          </View>
        </View>

        <View style={styles.block}>
          <AppText variant="small" color="textSecondary" style={styles.rowLabel}>
            Fonte
          </AppText>
          <SegmentedControl
            options={FONTS}
            value={settings.font}
            onChange={(font) => onChange({ font })}
            accessibilityLabel="Fonte"
          />
        </View>

        <View style={styles.block}>
          <AppText variant="small" color="textSecondary" style={styles.rowLabel}>
            Tema
          </AppText>
          <View style={styles.themes} accessibilityRole="radiogroup" accessibilityLabel="Tema">
            {(Object.keys(READER_THEMES) as ReaderThemeName[]).map((name) => {
              const theme = READER_THEMES[name];
              const selected = settings.theme === name;
              return (
                <Pressable
                  key={name}
                  onPress={() => onChange({ theme: name })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={theme.label}
                  style={styles.theme}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: theme.background, borderColor: theme.border },
                      selected && styles.swatchSelected,
                    ]}
                  >
                    <Text style={[styles.swatchText, { color: theme.text }]}>Aa</Text>
                    {selected && (
                      <View style={styles.check}>
                        <Ionicons name="checkmark" size={12} color={colors.surface} />
                      </View>
                    )}
                  </View>
                  <AppText variant="small" color={selected ? "primary700" : "textSecondary"}>
                    {theme.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

function StepButton({
  label,
  glyphSize,
  disabled,
  onPress,
}: {
  label: string;
  glyphSize: number;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.step,
        pressed && styles.stepPressed,
        disabled && styles.stepDisabled,
      ]}
    >
      <Text style={[styles.stepGlyph, { fontSize: glyphSize }]}>A</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  block: { gap: spacing.sm },
  rowLabel: { fontFamily: fontFamily.semibold },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  step: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepPressed: { backgroundColor: colors.background },
  stepDisabled: { opacity: 0.4 },
  stepGlyph: { fontFamily: fontFamily.serifSemibold, color: colors.textPrimary },
  sizeValue: { minWidth: 28, textAlign: "center", fontFamily: fontFamily.semibold },
  themes: { flexDirection: "row", gap: spacing.lg },
  theme: { alignItems: "center", gap: spacing.xs, minWidth: touchTarget },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchSelected: { borderWidth: 2, borderColor: colors.primary500 },
  swatchText: { fontFamily: fontFamily.serifSemibold, fontSize: 18 },
  check: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary500,
  },
});
