import { useState } from "react";
import {
  TextInput as RNTextInput,
  StyleSheet,
  View,
  type TextInputProps,
} from "react-native";

import { AppText } from "@/components/app-text";
import { colors, fontFamily, radius, spacing, touchTarget, typography } from "@/theme";

type Props = TextInputProps & { label?: string; error?: string | null };

export function TextInput({
  label,
  error,
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
        style={[
          styles.input,
          focused && styles.focused,
          !!error && styles.error,
          !editable && styles.disabled,
          style,
        ]}
      />
      {error && (
        <AppText variant="small" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontFamily: fontFamily.semibold },
  input: {
    ...typography.body,
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  focused: { borderColor: colors.primary500 },
  error: { borderColor: colors.error },
  disabled: { backgroundColor: colors.background, color: colors.textSecondary },
});
