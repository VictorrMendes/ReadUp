import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { DailyGoal, goalAction } from "@/components/daily-goal";
import { NextAchievementCard } from "@/components/next-achievement-card";
import { ReadingCard } from "@/components/reading-card";
import { Skeleton } from "@/components/skeleton";
import { StreakCard } from "@/components/streak-card";
import { XPBadge } from "@/components/xp-badge";
import { getAchievements, nextAchievement, type Achievement } from "@/lib/achievements";
import { ApiError } from "@/lib/api";
import {
  getContinueReading,
  listArticles,
  pickNextText,
  type ArticleSummary,
} from "@/lib/articles";
import { useAuth } from "@/lib/auth";
import { formatLongDate, formatNumber } from "@/lib/format";
import { enterFrom } from "@/lib/motion";
import { getGoal, type GoalStatus } from "@/lib/preferences";
import { syncReminders } from "@/lib/reminders";
import { getDaily, getSummary, type DailyStat, type StatsSummary } from "@/lib/stats";
import { useStreakHidden } from "@/lib/streak-visibility";
import { colors, fontFamily, spacing } from "@/theme";

// arte do herói: 390×280 (escala pela largura); os cartões começam 64dp antes do fim dela
const HERO_RATIO = 280 / 390;
const CARD_OVERLAP = 64;

type HomeData = {
  goal: GoalStatus;
  continueReading: ArticleSummary | null;
  suggestion: ArticleSummary | null; // sem texto em andamento: o próximo do nível da pessoa
  // opcionais: falha só deles esconde a parte que depende deles
  summary: StatsSummary | null;
  week: DailyStat[] | null;
  achievements: Achievement[] | null;
};

/** Linha do herói abaixo do "Olá" (design-v3 5.1). */
function heroMessage(goal: GoalStatus | undefined): string | null {
  if (!goal || goal.target === null) return null;
  if (goal.completed) return "Meta de hoje cumprida. Bom trabalho!";
  if (goal.words_today === 0) return "Que tal um texto curto agora?";
  return `Faltam ${formatNumber(goal.remaining)} palavras para fechar a meta.`;
}

function openArticle(id: number) {
  router.push({ pathname: "/article/[id]", params: { id: String(id) } });
}

export default function HomeScreen() {
  const { token, user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(true);
  const streakHidden = useStreakHidden();

  // recarrega ao voltar para a aba: reflete a leitura recém-feita
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (!token) return () => setFocused(false);
      let active = true;
      const level = user?.english_level ?? undefined;
      Promise.all([
        getGoal(token),
        getContinueReading(token),
        getSummary(token).catch(() => null),
        getDaily(token, 7).catch(() => null),
        getAchievements(token).catch(() => null),
      ])
        .then(async ([goal, continueReading, summary, week, achievements]) => {
          const suggestion = continueReading
            ? null
            : (pickNextText(await listArticles(token, level).catch(() => [])) ?? null);
          if (!active) return;
          setData({ goal, continueReading, suggestion, summary, week, achievements });
          setError(null);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 401) void signOut();
          else if (active) setError("Não foi possível carregar seu progresso.");
        });
      return () => {
        active = false;
        setFocused(false);
      };
    }, [token, user?.english_level, signOut]),
  );

  // lembretes acompanham o dia: hoje não lembra se a ofensiva já está garantida ou a meta
  // cumprida; com a ofensiva escondida, o texto não fala dela
  useEffect(() => {
    if (!data || streakHidden === null) return;
    void syncReminders(
      data.goal.completed || !!data.summary?.streak_active_today,
      streakHidden ? 0 : (data.summary?.streak_current ?? 0),
    );
  }, [data, streakHidden]);

  const goal = data?.goal;
  const summary = data?.summary;
  const heroHeight = width * HERO_RATIO;
  const message = heroMessage(goal);
  const next = data?.achievements ? nextAchievement(data.achievements) : undefined;
  const readTarget = data?.continueReading ?? data?.suggestion ?? null;
  const action = goal
    ? {
        ...goalAction(goal.completed, !!data?.continueReading),
        onPress: () => (readTarget ? openArticle(readTarget.id) : router.navigate("/read")),
      }
    : undefined;

  return (
    <View style={styles.screen}>
      {/* conteúdo sob a status bar: ícones claros só enquanto o Início está na frente */}
      <StatusBar style={focused ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image
          source={require("@/assets/images/home-hero.png")}
          style={[styles.heroArt, { width, height: heroHeight }]}
          resizeMode="cover"
          accessible={false}
          accessibilityIgnoresInvertColors
        />
        <View
          style={[
            styles.hero,
            { paddingTop: insets.top + spacing.lg, minHeight: heroHeight - CARD_OVERLAP },
          ]}
        >
          <View style={styles.heroRow}>
            <AppText variant="small" color="surface" style={styles.semibold}>
              {formatLongDate(new Date())}
            </AppText>
            {summary && <XPBadge xp={summary.xp_total} onHero />}
          </View>
          <AppText variant="h1" color="surface" accessibilityRole="header">
            Olá, {user?.name ?? ""}
          </AppText>
          {message && (
            <AppText color="surface" style={styles.heroMessage}>
              {message}
            </AppText>
          )}
        </View>

        <View style={styles.content}>
          {error && !data ? (
            <AppText variant="small" color="textSecondary">
              {error}
            </AppText>
          ) : !data ? (
            <View style={styles.section} accessible accessibilityLabel="Carregando">
              <Skeleton height={236} />
              <Skeleton height={148} />
            </View>
          ) : (
            <>
              {goal?.target != null && (
                <Animated.View entering={enterFrom(0)}>
                  <DailyGoal
                    target={goal.target}
                    wordsToday={goal.words_today}
                    remaining={goal.remaining}
                    completed={goal.completed}
                    action={action}
                  />
                </Animated.View>
              )}

              {summary && streakHidden === false && (
                <Animated.View entering={enterFrom(1)}>
                  <StreakCard
                    current={summary.streak_current}
                    longest={summary.streak_longest}
                    activeToday={summary.streak_active_today}
                    goalMetToday={goal?.completed}
                    freezes={summary.streak_freezes}
                    wordsTotal={summary.words_total}
                    week={data.week ?? undefined}
                  />
                </Animated.View>
              )}

              {next && (
                <Animated.View entering={enterFrom(2)}>
                  <NextAchievementCard achievement={next} />
                </Animated.View>
              )}

              <Animated.View entering={enterFrom(3)} style={styles.section}>
                <AppText variant="h3" accessibilityRole="header">
                  {data.continueReading ? "Continuar lendo" : "Sugerido para você"}
                </AppText>
                {readTarget ? (
                  <ReadingCard article={readTarget} onPress={() => openArticle(readTarget.id)} />
                ) : (
                  <>
                    <AppText color="textSecondary">Você já leu todos os textos do seu nível.</AppText>
                    <Button title="Ver textos" onPress={() => router.navigate("/read")} />
                  </>
                )}
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  heroArt: { position: "absolute", top: 0, left: 0 },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.xs },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heroMessage: { maxWidth: "64%" },
  semibold: { fontFamily: fontFamily.semibold },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  section: { gap: spacing.md },
});
