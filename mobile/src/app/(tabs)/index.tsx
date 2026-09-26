import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useCurrentUser } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/theme";

export default function HomeScreen() {
  const { user, error } = useCurrentUser();

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : user ? (
        <Text style={styles.greeting}>Olá, {user.name}</Text>
      ) : (
        <ActivityIndicator color={colors.primary500} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.background },
  greeting: { fontSize: fontSize.h1, fontWeight: "700", color: colors.textPrimary },
  error: { fontSize: fontSize.body, color: colors.error },
});
