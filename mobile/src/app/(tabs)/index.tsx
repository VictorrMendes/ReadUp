import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { useCurrentUser } from "@/lib/auth";
import { colors, spacing } from "@/theme";

export default function HomeScreen() {
  const { user, error } = useCurrentUser();

  return (
    <View style={styles.container}>
      {error ? (
        <AppText color="error">{error}</AppText>
      ) : user ? (
        <AppText variant="h1">Olá, {user.name}</AppText>
      ) : (
        <ActivityIndicator color={colors.primary500} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, backgroundColor: colors.background },
});
