import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { DailyGoal } from "@/components/daily-goal";
import { Highlight } from "@/components/highlight";
import { ReadingCard } from "@/components/reading-card";
import { Skeleton } from "@/components/skeleton";
import { XPBadge } from "@/components/xp-badge";
import { ApiError } from "@/lib/api";
import { getContinueReading, type ArticleSummary } from "@/lib/articles";
import { useAuth } from "@/lib/auth";
import { getGoal, type GoalStatus } from "@/lib/preferences";
import { getSummary } from "@/lib/stats";
import { colors, spacing } from "@/theme";

type HomeData = {
  goal: GoalStatus;
  continueReading: ArticleSummary | null;
  xpTotal: number | null;
};

export default function HomeScreen() {
  const { token, user, signOut } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // recarrega ao voltar para a aba: reflete a leitura recém-feita
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let active = true;
      Promise.all([
        getGoal(token),
        getContinueReading(token),
        // falha só do resumo não derruba a tela: o badge some
        getSummary(token).then(
          (summary) => summary.xp_total,
          () => null,
        ),
      ])
        .then(([goal, continueReading, xpTotal]) => {
          if (!active) return;
          setData({ goal, continueReading, xpTotal });
          setError(null);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 401) void signOut();
          else if (active) setError("Não foi possível carregar seu progresso.");
        });
      return () => {
        active = false;
      };
    }, [token, signOut]),
  );

  const goal = data?.goal;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View
            style={styles.greeting}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`Olá, ${user?.name ?? ""}`}
          >
            <AppText variant="h1">Olá, </AppText>
            <Highlight variant="h1">{user?.name ?? ""}</Highlight>
          </View>
          {data?.xpTotal != null && <XPBadge xp={data.xpTotal} />}
        </View>

        {error && !data ? (
          <AppText variant="small" color="textSecondary">
            {error}
          </AppText>
        ) : !data ? (
          <View accessible accessibilityLabel="Carregando">
            <Skeleton height={148} />
          </View>
        ) : (
          <>
            {goal?.target != null && (
              <DailyGoal
                target={goal.target}
                wordsToday={goal.words_today}
                remaining={goal.remaining}
                completed={goal.completed}
              />
            )}

            <View style={styles.section}>
              <AppText variant="h3" accessibilityRole="header">
                Continuar lendo
              </AppText>
              {data.continueReading ? (
                <ReadingCard
                  article={data.continueReading}
                  onPress={() =>
                    router.push({
                      pathname: "/article/[id]",
                      params: { id: String(data.continueReading?.id) },
                    })
                  }
                />
              ) : (
                <>
                  <AppText color="textSecondary">Nenhum texto em andamento.</AppText>
                  <Button title="Explorar textos" onPress={() => router.navigate("/explore")} />
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, gap: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  greeting: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
  section: { gap: spacing.md },
});
