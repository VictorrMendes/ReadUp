import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Switch, View } from "react-native";

import { AchievementBadge } from "@/components/achievement-badge";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { OptionList } from "@/components/option-list";
import { Skeleton } from "@/components/skeleton";
import { StatTile } from "@/components/stat-tile";
import { WeekChart } from "@/components/week-chart";
import { getAchievements, type Achievement } from "@/lib/achievements";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { GOAL_OPTIONS, LEVEL_OPTIONS, setGoal, setLevel } from "@/lib/preferences";
import { getDaily, getSummary, type DailyStat, type StatsSummary } from "@/lib/stats";
import { setStreakHidden, useStreakHidden } from "@/lib/streak-visibility";
import { colors, compactFontScale, fontFamily, spacing } from "@/theme";

const SAVED_FEEDBACK_MS = 2000;

// "Ana Maria Souza" -> "AS"; "ana" -> "A"
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0].toUpperCase()).join("");
}

// null em achievements: só essa chamada falhou (a seção some, o resto aparece)
type Stats = { summary: StatsSummary; daily: DailyStat[]; achievements: Achievement[] | null };

// 2 colunas: em 360dp, 3 cortariam títulos como "Cinquenta mil palavras"
function pairs<T>(items: T[]): T[][] {
  return items.reduce<T[][]>((rows, item, i) => {
    if (i % 2 === 0) rows.push([item]);
    else rows[rows.length - 1].push(item);
    return rows;
  }, []);
}

export default function ProfileScreen() {
  const { token, user, signOut, refreshUser } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streakHidden = useStreakHidden();

  // recarrega ao focar a aba: números da leitura recém-feita
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let active = true;
      Promise.all([
        getSummary(token),
        getDaily(token, 7),
        getAchievements(token).catch(() => null),
      ])
        .then(([summary, daily, achievements]) => {
          if (!active) return;
          setStats({ summary, daily, achievements });
          setStatsError(false);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 401) void signOut();
          else if (active) setStatsError(true);
        });
      return () => {
        active = false;
      };
    }, [token, signOut]),
  );

  // "Salvo" some sozinho
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  // escolher uma opção já salva (PATCH nível / PUT meta) e atualiza o usuário do contexto
  async function save(change: (token: string) => Promise<unknown>) {
    if (!token) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await change(token);
      await refreshUser();
      setSaved(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return void signOut();
      setError(e instanceof ApiError ? e.detail : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  const summary = stats?.summary;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Card style={styles.identity}>
        <View style={styles.avatar} importantForAccessibility="no-hide-descendants">
          <AppText variant="h3" color="primary600" maxFontSizeMultiplier={compactFontScale}>
            {initials(user.name)}
          </AppText>
        </View>
        <View style={styles.identityText}>
          <AppText variant="h2" numberOfLines={1}>
            {user.name}
          </AppText>
          <AppText color="textSecondary" numberOfLines={1}>
            {user.email}
          </AppText>
        </View>
      </Card>

      {statsError && !stats ? (
        <AppText variant="small" color="textSecondary">
          Não foi possível carregar suas estatísticas.
        </AppText>
      ) : !summary || !stats ? (
        <View style={styles.section} accessible accessibilityLabel="Carregando estatísticas">
          <Skeleton height={196} />
          <Skeleton height={180} />
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <StatTile
                value={summary.streak_current}
                label="dias de ofensiva"
                icon={
                  <Image
                    source={
                      summary.streak_active_today
                        ? require("@/assets/images/streak.png")
                        : require("@/assets/images/streak-inactive.png")
                    }
                    style={styles.streakIcon}
                    accessibilityIgnoresInvertColors
                    accessible={false}
                  />
                }
              />
              <StatTile value={summary.streak_longest} label="dias na maior ofensiva" />
            </View>
            <View style={styles.gridRow}>
              <StatTile
                value={summary.xp_total}
                label="XP total"
                accessibilityLabel={`${formatNumber(summary.xp_total)} pontos de experiência`}
              />
              <StatTile value={summary.words_total} label="palavras lidas" />
            </View>
            <View style={styles.gridRow}>
              <StatTile value={summary.minutes_total} label="minutos de leitura" />
              <StatTile value={summary.texts_completed_total} label="textos concluídos" />
            </View>
            <View style={styles.gridRow}>
              <StatTile
                value={`${formatNumber(summary.books_started)} / ${formatNumber(summary.books_completed)}`}
                label="livros iniciados / concluídos"
                accessibilityLabel={
                  `${formatNumber(summary.books_started)} livros iniciados, ` +
                  `${formatNumber(summary.books_completed)} concluídos`
                }
              />
              <StatTile value={summary.words_saved_total} label="palavras salvas" />
            </View>
          </View>
          <WeekChart days={stats.daily} />
          {stats.achievements && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText variant="h3" accessibilityRole="header">
                  Conquistas
                </AppText>
                <AppText variant="small" color="textSecondary">
                  {stats.achievements.filter((a) => a.unlocked).length} de{" "}
                  {stats.achievements.length}
                </AppText>
              </View>
              {pairs(stats.achievements).map((row) => (
                <View key={row[0].id} style={styles.gridRow}>
                  {row.map((achievement) => (
                    <AchievementBadge key={achievement.id} achievement={achievement} />
                  ))}
                  {row.length === 1 && <View style={styles.filler} />}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {error && (
        <AppText variant="small" color="errorText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      {saved && (
        <View style={styles.saved} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={14} color={colors.success600} />
          <AppText variant="caption">Salvo</AppText>
        </View>
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

      <View style={styles.toggle}>
        <View style={styles.toggleText}>
          <AppText style={styles.semibold}>Mostrar ofensiva</AppText>
          <AppText variant="small" color="textSecondary">
            Some do Início e da tela de conclusão. Continua contando.
          </AppText>
        </View>
        <Switch
          accessibilityLabel="Mostrar ofensiva"
          value={streakHidden === false}
          disabled={streakHidden === null}
          onValueChange={(show) => void setStreakHidden(!show).catch(() => {})}
          trackColor={{ true: colors.primary500, false: colors.border }}
        />
      </View>

      <Button variant="ghost" title="Sair" onPress={signOut} style={styles.signOut} />
    </ScrollView>
  );
}

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, gap: spacing.md },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.sm },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.md },
  grid: { gap: spacing.md },
  gridRow: { flexDirection: "row", gap: spacing.md },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  filler: { flex: 1 },
  streakIcon: { width: 20, height: 20 },
  saved: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  signOut: { marginTop: spacing.xl },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  toggleText: { flex: 1, gap: spacing.xs },
  semibold: { fontFamily: fontFamily.semibold },
});
