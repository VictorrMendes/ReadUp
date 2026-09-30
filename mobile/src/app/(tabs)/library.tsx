import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BookCard } from "@/components/book-card";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { listBooks, uploadBook, type Book } from "@/lib/books";
import { colors, spacing } from "@/theme";

function openBook(id: number) {
  router.push({ pathname: "/book/[id]", params: { id: String(id) } });
}

export default function LibraryScreen() {
  const { token, signOut } = useAuth();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // recarrega ao focar a aba: mostra o progresso de leitura atualizado
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let active = true;
      listBooks(token)
        .then((result) => {
          if (!active) return;
          setError(null);
          setBooks(result);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 401) void signOut();
          else if (active)
            setError(e instanceof ApiError ? e.detail : "Não foi possível carregar seus livros.");
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
    setBooks(null);
    setReloadKey((k) => k + 1);
  }

  function refresh() {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  }

  async function importPdf() {
    if (!token || importing) return;
    setImportError(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    setImporting(true);
    try {
      const book = await uploadBook(token, picked.assets[0]);
      setReloadKey((k) => k + 1);
      openBook(book.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) void signOut();
      // 413/422/409 trazem a mensagem do backend (tamanho, não é PDF, sem texto, limite)
      else
        setImportError(
          e instanceof ApiError ? e.detail : "Não foi possível enviar o PDF. Tente novamente.",
        );
    } finally {
      setImporting(false);
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
  if (books === null) {
    return (
      <View style={styles.list} accessible accessibilityLabel="Carregando livros">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={132} />
        ))}
      </View>
    );
  }

  const empty = books.length === 0;
  return (
    <FlatList
      data={books}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <BookCard book={item} onPress={() => openBook(item.id)} />}
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
      ListHeaderComponent={
        <View style={styles.header}>
          {/* vazio: o botão é a ação do EmptyState */}
          {!empty && <Button title="Importar PDF" loading={importing} onPress={importPdf} />}
          {importing && (
            <AppText variant="small" color="textSecondary" accessibilityLiveRegion="polite">
              Processando PDF…
            </AppText>
          )}
          {importError && (
            <AppText variant="small" color="errorText" accessibilityLiveRegion="polite">
              {importError}
            </AppText>
          )}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="library-outline"
          illustration={require("@/assets/images/empty-library.png")}
          title="Você ainda não possui livros"
          message="Importe seu primeiro PDF para começar."
          action={{ label: "Importar PDF", onPress: importPdf, loading: importing }}
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
  header: { gap: spacing.sm },
});
