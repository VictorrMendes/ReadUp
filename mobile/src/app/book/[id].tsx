import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { IconButton } from "@/components/icon-button";
import { ReadingCard } from "@/components/reading-card";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { continueChapter, deleteBook, getBook, type BookDetail } from "@/lib/books";
import { formatNumber } from "@/lib/format";
import { colors, spacing } from "@/theme";

function goBack() {
  // aberto por deep link não há histórico: volta para a Biblioteca
  if (router.canGoBack()) router.back();
  else router.replace("/library");
}

function openChapter(id: number) {
  router.push({ pathname: "/article/[id]", params: { id: String(id) } });
}

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = Number(id);
  const validId = Number.isInteger(bookId) && bookId > 0;
  const { token, signOut } = useAuth();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // recarrega ao voltar do leitor: progresso dos capítulos atualizado
  useFocusEffect(
    useCallback(() => {
      if (!token || !validId) return;
      let active = true;
      getBook(token, bookId)
        .then((result) => {
          if (!active) return;
          setError(null);
          setBook(result);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 401) void signOut();
          else if (active)
            setError(
              e instanceof ApiError && e.status === 404
                ? { message: e.detail, notFound: true }
                : {
                    message: e instanceof ApiError ? e.detail : "Não foi possível abrir o livro.",
                    notFound: false,
                  },
            );
        });
      return () => {
        active = false;
      };
      // reloadKey: repetir a busca (tentar novamente)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, bookId, validId, signOut, reloadKey]),
  );

  function confirmDelete(current: BookDetail) {
    Alert.alert("Remover livro", `Remover "${current.title}" e o progresso de leitura dele?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => void remove(current) },
    ]);
  }

  async function remove(current: BookDetail) {
    if (!token) return;
    try {
      await deleteBook(token, current.id);
      goBack();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) void signOut();
      else Alert.alert("Não foi possível remover o livro.", "Tente novamente.");
    }
  }

  const next = book && continueChapter(book.chapters);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-back" accessibilityLabel="Voltar" onPress={goBack} />
        {book && (
          <IconButton
            icon="trash-outline"
            color="textSecondary"
            accessibilityLabel={`Remover ${book.title}`}
            onPress={() => confirmDelete(book)}
          />
        )}
      </View>

      {!validId || error?.notFound ? (
        <View style={styles.center}>
          <AppText>Livro não encontrado</AppText>
          <Button variant="secondary" title="Voltar" onPress={goBack} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppText color="errorText" style={styles.centerText}>
            {error.message}
          </AppText>
          <Button
            title="Tentar novamente"
            onPress={() => {
              setError(null);
              setReloadKey((k) => k + 1);
            }}
          />
        </View>
      ) : !book ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary500} />
        </View>
      ) : (
        <FlatList
          data={book.chapters}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <AppText variant="h1" accessibilityRole="header">
                {book.title}
              </AppText>
              <AppText variant="small" color="textSecondary">
                {formatNumber(book.chapter_count)}{" "}
                {book.chapter_count === 1 ? "capítulo" : "capítulos"} ·{" "}
                {formatNumber(book.word_count)} palavras
              </AppText>
              {next && (
                <Button
                  title="Continuar leitura"
                  onPress={() => openChapter(next.id)}
                  style={styles.continue}
                />
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ReadingCard
              article={{
                title: item.title,
                difficulty: null,
                category: `Capítulo ${item.position}`,
                word_count: item.word_count,
                estimated_minutes: item.estimated_minutes,
                progress: item.progress,
                completed: item.completed,
              }}
              onPress={() => openChapter(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  centerText: { textAlign: "center" },
  list: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  continue: { marginTop: spacing.sm },
});
