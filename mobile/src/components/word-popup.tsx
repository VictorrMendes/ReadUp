import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { Skeleton } from "@/components/skeleton";
import { ApiError } from "@/lib/api";
import { deleteWord, lookupWord, saveWord, type Lookup } from "@/lib/vocabulary";
import { colors, fontFamily, spacing } from "@/theme";

export type WordSelection = { word: string; sentence: string };

type Props = {
  // palavra tocada e a frase em que aparece; null = fechado
  selection: WordSelection | null;
  token: string | null;
  articleId: number;
  onClose: () => void;
  onUnauthorized: () => void;
};

// Painel da palavra tocada no leitor: tradução, frase de contexto e salvar/remover, sem tirar o
// usuário da leitura.
export function WordPopup({ selection, ...props }: Props) {
  return (
    <BottomSheet visible={selection !== null} onClose={props.onClose}>
      {selection && <Content key={selection.word} selection={selection} {...props} />}
    </BottomSheet>
  );
}

function Content({
  selection: { word, sentence },
  token,
  articleId,
  onUnauthorized,
}: Omit<Props, "selection" | "onClose"> & { selection: WordSelection }) {
  // undefined = carregando; translation null = indisponível
  const [lookup, setLookup] = useState<Lookup | undefined>(undefined);
  // id da palavra salva (do lookup ou do salvar deste painel); null = não salva
  const [savedId, setSavedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    lookupWord(token, word)
      .then((result) => {
        if (!active) return;
        setLookup(result);
        setSavedId(result.saved_id);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) onUnauthorized();
        else if (active) setLookup({ word, translation: null, saved: false, saved_id: null });
      });
    return () => {
      active = false;
    };
  }, [token, word, onUnauthorized]);

  async function run(action: (token: string) => Promise<void>, failure: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await action(token);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onUnauthorized();
      else setError(failure);
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async (t) => {
      const created = await saveWord(t, { word, article_id: articleId, context: sentence });
      setSavedId(created.id);
    }, "Não foi possível salvar. Tente novamente.");

  const remove = () =>
    run(async (t) => {
      if (savedId === null) return;
      await deleteWord(t, savedId);
      setSavedId(null);
    }, "Não foi possível remover. Tente novamente.");

  return (
    <View style={styles.content}>
      <AppText variant="h2" accessibilityRole="header">
        {word}
      </AppText>
      {lookup === undefined ? (
        <View accessible accessibilityLabel="Carregando tradução">
          <Skeleton height={24} width="60%" />
        </View>
      ) : lookup.translation ? (
        <AppText>{lookup.translation}</AppText>
      ) : (
        <AppText color="textSecondary">Tradução indisponível no momento</AppText>
      )}
      <AppText variant="small" color="textSecondary">
        {sentence}
      </AppText>
      {error && (
        <AppText variant="small" color="errorText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      {savedId !== null ? (
        <View style={styles.saved}>
          <View style={styles.savedLabel}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success600} />
            <AppText style={styles.semibold}>Palavra salva</AppText>
          </View>
          <Button variant="ghost" title="Remover" loading={busy} onPress={remove} />
        </View>
      ) : (
        <Button
          title="Salvar palavra"
          loading={busy}
          disabled={lookup === undefined}
          onPress={save}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  saved: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  savedLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  semibold: { fontFamily: fontFamily.semibold },
});
