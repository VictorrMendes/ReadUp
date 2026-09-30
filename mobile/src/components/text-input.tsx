import { useState, type ReactNode } from "react";
import { TextInput as RNTextInput, StyleSheet, View, type TextInputProps } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, fontFamily, radius, spacing, touchTarget, typography } from "@/theme";

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  // conteúdo dentro do campo, à direita (ex.: botão mostrar/ocultar senha)
  accessory?: ReactNode;
};

export function TextInput({
  label,
  error,
  accessory,
  editable = true,
  style,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="small" style={styles.label}>
          {label}
        </AppText>
      )}
      {/* a borda fica no contêiner, para o acessório ficar dentro do campo */}
      <View
        style={[
          styles.field,
          focused && styles.focused,
          !!error && styles.error,
          !editable && styles.disabled,
        ]}
      >
        <RNTextInput
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          {...props}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, !editable && styles.inputDisabled, style]}
        />
        {accessory}
      </View>
      {error && (
        <AppText variant="small" color="errorText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontFamily: fontFamily.semibold },
  field: {
    minHeight: touchTarget,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
  },
  focused: { borderWidth: 2, borderColor: colors.primary500 },
  error: { borderColor: colors.error },
  disabled: { backgroundColor: colors.background },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
  },
  inputDisabled: { color: colors.textSecondary },
});
