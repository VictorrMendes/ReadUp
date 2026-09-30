import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { OptionList } from "@/components/option-list";
import { ApiError } from "@/lib/api";
import type { Level } from "@/lib/articles";
import { useAuth } from "@/lib/auth";
import { GOAL_OPTIONS, LEVEL_OPTIONS, setGoal, setLevel } from "@/lib/preferences";
import { colors, spacing } from "@/theme";

export default function OnboardingScreen() {
  const { token, user, refreshUser, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [level, setLevelChoice] = useState<Level | null>(user?.english_level ?? null);
  const [goal, setGoalChoice] = useState<number | null>(user?.daily_goal ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!token || !level || !goal) return;
    setSaving(true);
    setError(null);
    try {
      await setLevel(token, level);
      await setGoal(token, goal);
      await refreshUser(); // o guard do _layout leva às abas
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return void signOut();
      setError(e instanceof ApiError ? e.detail : "Não foi possível salvar. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppText variant="h1">Vamos começar</AppText>
        <AppText color="textSecondary">
          Escolha seu nível e quanto quer ler por dia. Dá para mudar depois no Perfil.
        </AppText>

        <AppText variant="h3" accessibilityRole="header" style={styles.section}>
          Seu nível de inglês
        </AppText>
        <OptionList
          options={LEVEL_OPTIONS}
          value={level}
          onChange={setLevelChoice}
          accessibilityLabel="Seu nível de inglês"
        />

        <AppText variant="h3" accessibilityRole="header" style={styles.section}>
          Meta diária
        </AppText>
        <OptionList
          options={GOAL_OPTIONS}
          value={goal}
          onChange={setGoalChoice}
          accessibilityLabel="Meta diária"
        />
      </ScrollView>

      {/* footer fixo: o botão fica sempre visível, fora das listas longas */}
      <View style={[styles.footer, { paddingBottom: spacing.lg + insets.bottom }]}>
        {error && (
          <AppText variant="small" color="errorText" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        )}
        <Button title="Começar" onPress={start} loading={saving} disabled={!level || !goal} />
        {(!level || !goal) && (
          <AppText variant="caption" color="textSecondary" style={styles.hint}>
            Escolha nível e meta para continuar
          </AppText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, gap: spacing.md },
  section: { marginTop: spacing.lg },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  hint: { textAlign: "center" },
});
