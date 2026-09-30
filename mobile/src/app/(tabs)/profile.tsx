import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { OptionList } from "@/components/option-list";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { GOAL_OPTIONS, LEVEL_OPTIONS, setGoal, setLevel } from "@/lib/preferences";
import { colors, spacing } from "@/theme";

export default function ProfileScreen() {
  const { token, user, signOut, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // escolher uma opção já salva (PATCH nível / PUT meta) e atualiza o usuário do contexto
  async function save(change: (token: string) => Promise<unknown>) {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await change(token);
      await refreshUser();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return void signOut();
      setError(e instanceof ApiError ? e.detail : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <AppText variant="h2">{user.name}</AppText>
        <AppText color="textSecondary">{user.email}</AppText>
      </Card>

      {error && (
        <AppText variant="small" color="errorText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}

      <AppText variant="h3" accessibilityRole="header">
        Nível de inglês
      </AppText>
      <OptionList
        options={LEVEL_OPTIONS}
        accessibilityLabel="Nível de inglês"
        value={user.english_level}
        onChange={(level) => save((t) => setLevel(t, level))}
        disabled={saving}
      />

      <AppText variant="h3" accessibilityRole="header">
        Meta diária
      </AppText>
      <OptionList
        options={GOAL_OPTIONS}
        accessibilityLabel="Meta diária"
        value={user.daily_goal}
        onChange={(target) => save((t) => setGoal(t, target))}
        disabled={saving}
      />

      <Button variant="secondary" title="Sair" onPress={signOut} style={styles.signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, gap: spacing.md },
  card: { gap: spacing.xs, marginBottom: spacing.md },
  signOut: { marginTop: spacing.xl },
});
