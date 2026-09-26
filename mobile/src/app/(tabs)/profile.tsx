import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { useAuth, useCurrentUser } from "@/lib/auth";
import { colors, spacing } from "@/theme";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user, error } = useCurrentUser();

  return (
    <View style={styles.container}>
      {error ? (
        <AppText color="error">{error}</AppText>
      ) : user ? (
        <Card style={styles.card}>
          <AppText variant="h2">{user.name}</AppText>
          <AppText color="textSecondary">{user.email}</AppText>
        </Card>
      ) : (
        <ActivityIndicator color={colors.primary500} />
      )}

      <Button variant="secondary" title="Sair" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.xl, backgroundColor: colors.background },
  card: { gap: spacing.xs },
});
