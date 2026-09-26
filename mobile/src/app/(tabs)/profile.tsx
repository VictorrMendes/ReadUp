import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth, useCurrentUser } from "@/lib/auth";
import { colors, fontSize, radius, spacing, touchTarget } from "@/theme";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user, error } = useCurrentUser();

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : user ? (
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      ) : (
        <ActivityIndicator color={colors.primary500} />
      )}

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={signOut}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.xl, backgroundColor: colors.background },
  card: {
    padding: spacing.xl,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  name: { fontSize: fontSize.h2, fontWeight: "600", color: colors.textPrimary },
  email: { fontSize: fontSize.body, color: colors.textSecondary },
  error: { fontSize: fontSize.body, color: colors.error },
  button: {
    minHeight: touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  buttonPressed: { backgroundColor: colors.border },
  buttonText: { fontSize: fontSize.body, fontWeight: "600", color: colors.error },
});
