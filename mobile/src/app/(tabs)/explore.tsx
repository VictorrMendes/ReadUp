import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { ReadingCard } from "@/components/reading-card";
import { ApiError } from "@/lib/api";
import { LEVELS, listArticles, type ArticleSummary, type Level } from "@/lib/articles";
import { useAuth } from "@/lib/auth";
import { colors, fontFamily, radius, spacing, touchTarget } from "@/theme";

const FILTERS: (Level | null)[] = [null, ...LEVELS];

export default function ExploreScreen() {
  const { token, signOut } = useAuth();
  const [level, setLevel] = useState<Level | null>(null);
  const [articles, setArticles] = useState<ArticleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    // "active" descarta respostas de um filtro antigo que cheguem depois do atual
    let active = true;
    listArticles(token, level ?? undefined)
      .then((result) => {
        if (!active) return;
        setError(null);
        setArticles(result);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) void signOut();
        else if (active)
          setError(e instanceof ApiError ? e.detail : "Não foi possível carregar os textos.");
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [token, level, reloadKey, signOut]);

  // ao voltar do leitor, recarrega para mostrar o progresso atualizado (a 1ª vez já carrega acima)
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) setReloadKey((k) => k + 1);
      focusedBefore.current = true;
    }, []),
  );

  function selectLevel(next: Level | null) {
    setLevel(next);
    setArticles(null);
    setError(null);
  }

  function retry() {
    setError(null);
    setArticles(null);
    setReloadKey((k) => k + 1);
  }

  function refresh() {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((option) => {
          const selected = option === level;
          return (
            <Pressable
              key={option ?? "all"}
              onPress={() => selectLevel(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <AppText
                variant="small"
                color={selected ? "surface" : "textPrimary"}
                style={styles.chipLabel}
              >
                {option ?? "Todos"}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.center}>
          <AppText color="error" style={styles.errorText}>
            {error}
          </AppText>
          <Button title="Tentar novamente" onPress={retry} />
        </View>
      ) : articles === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary500} />
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ReadingCard
              article={item}
              onPress={() =>
                router.push({ pathname: "/article/[id]", params: { id: String(item.id) } })
              }
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[colors.primary500]}
              tintColor={colors.primary500}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="compass-outline"
              title="Nenhum texto para este nível ainda."
              message="Escolha outro nível ou volte mais tarde."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterBar: { flexGrow: 0 },
  filters: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chip: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary500, borderColor: colors.primary500 },
  chipLabel: { fontFamily: fontFamily.semibold },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorText: { textAlign: "center" },
  list: { flexGrow: 1, gap: spacing.md, padding: spacing.lg },
});
