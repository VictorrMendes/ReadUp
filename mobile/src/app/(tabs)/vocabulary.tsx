import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { Skeleton } from "@/components/skeleton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { deleteWord, listWords, type SavedWord } from "@/lib/vocabulary";
import { colors, spacing } from "@/theme";

export default function VocabularyScreen() {
  const { token, signOut } = useAuth();
  const [words, setWords] = useState<SavedWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // recarrega ao focar a aba: mostra as palavras salvas na leitura recém-feita
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let active = true;
      listWords(token)
        .then((result) => {
          if (!active) return;
          setError(null);
          setWords(result);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 401) void signOut();
          else if (active)
            setError(e instanceof ApiError ? e.detail : "Não foi possível carregar suas palavras.");
        })
        .finally(() => {
          if (active) setRefreshing(false);
        });
      return () => {
        active = false;
      };
      // reloadKey: repetir a busca (tentar novamente, puxar para atualizar)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, signOut, reloadKey]),
  );

  function retry() {
    setError(null);
    setWords(null);
    setReloadKey((k) => k + 1);
  }

  function refresh() {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  }

  function confirmRemove(item: SavedWord) {
    Alert.alert("Remover palavra", `Remover "${item.word}" do seu vocabulário?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => void remove(item) },
    ]);
  }

  async function remove(item: SavedWord) {
    if (!token) return;
    try {
      await deleteWord(token, item.id);
      setWords((current) => current?.filter((w) => w.id !== item.id) ?? null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) void signOut();
      else Alert.alert("Não foi possível remover a palavra.", "Tente novamente.");
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <AppText color="errorText" style={styles.errorText}>
          {error}
        </AppText>
        <Button title="Tentar novamente" onPress={retry} />
      </View>
    );
  }
  if (words === null) {
    return (
      <View style={styles.list} accessible accessibilityLabel="Carregando palavras">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={132} />
        ))}
      </View>
    );
  }
  return (
    <FlatList
      data={words}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <View style={styles.text}>
            <AppText variant="h3">{item.word}</AppText>
            {item.translation ? (
              <AppText>{item.translation}</AppText>
            ) : (
              <AppText color="textSecondary">Sem tradução</AppText>
            )}
            {item.context && (
              <AppText variant="small" color="textSecondary" numberOfLines={2}>
                {item.context}
              </AppText>
            )}
            {item.article_title && (
              <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                {item.article_title}
              </AppText>
            )}
          </View>
          <IconButton
            icon="trash-outline"
            color="textSecondary"
            accessibilityLabel={`Remover ${item.word}`}
            onPress={() => confirmRemove(item)}
          />
        </Card>
      )}
      style={styles.container}
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
          icon="language-outline"
          illustration={require("@/assets/images/empty-vocabulary.png")}
          title="Nenhuma palavra salva ainda"
          message="Toque em uma palavra durante a leitura para salvá-la aqui."
          action={{ label: "Explorar textos", onPress: () => router.navigate("/explore") }}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  errorText: { textAlign: "center" },
  list: { flexGrow: 1, gap: spacing.md, padding: spacing.lg },
  card: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  text: { flex: 1, gap: spacing.xs },
});
