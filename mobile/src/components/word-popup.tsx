import Ionicons from "@expo/vector-icons/Ionicons";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { AppText } from "@/components/app-text";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { ContextSentence } from "@/components/context-sentence";
import { IconButton } from "@/components/icon-button";
import { Skeleton } from "@/components/skeleton";
import { ApiError } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { springs } from "@/lib/motion";
import { speak } from "@/lib/speech";
import {
  deleteWord,
  lookupWord,
  saveWord,
  translateSentence,
  type Lookup,
} from "@/lib/vocabulary";
import { colors, fontFamily, spacing } from "@/theme";

// word null: a pessoa segurou o dedo e escolheu a frase inteira
export type WordSelection = { word: string | null; sentence: string };

type Props = {
  // palavra tocada e a frase em que aparece; null = fechado
  selection: WordSelection | null;
  token: string | null;
  articleId: number;
  onClose: () => void;
  onUnauthorized: () => void;
};

// Painel do leitor sem tirar a pessoa da leitura. Palavra tocada: pronúncia, tradução, frase de
// contexto (com tradução sob demanda) e salvar/remover. Frase (dedo segurado): frase, ouvir e
// tradução.
export function WordPopup({ selection, ...props }: Props) {
  return (
    <BottomSheet visible={selection !== null} onClose={props.onClose}>
      {selection &&
        (selection.word === null ? (
          <SentenceContent key={selection.sentence} sentence={selection.sentence} {...props} />
        ) : (
          <Content
            key={selection.word}
            selection={{ word: selection.word, sentence: selection.sentence }}
            {...props}
          />
        ))}
    </BottomSheet>
  );
}

type ContentProps = Omit<Props, "selection" | "onClose">;

type SentenceState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; translation: string | null }
  | { kind: "error"; message: string };

/** Tradução de frase pedida ao backend; erros viram mensagem curta (limite diário, rede). */
function useSentenceTranslation({ token, articleId, onUnauthorized }: ContentProps) {
  const [state, setState] = useState<SentenceState>({ kind: "idle" });

  async function request(sentence: string) {
    if (!token) return;
    setState({ kind: "loading" });
    try {
      const result = await translateSentence(token, articleId, sentence);
      setState({ kind: "done", translation: result.translation });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return onUnauthorized();
      setState({
        kind: "error",
        message:
          e instanceof ApiError && e.status === 429
            ? "Você atingiu o limite de traduções de frase de hoje. Volte amanhã!"
            : "Tradução da frase indisponível no momento.",
      });
    }
  }

  return { state, request };
}

function SentenceTranslationView({ state }: { state: SentenceState }) {
  if (state.kind === "loading") {
    return (
      <View accessible accessibilityLabel="Traduzindo a frase">
        <Skeleton height={20} width="80%" />
      </View>
    );
  }
  if (state.kind === "error") {
    return (
      <AppText variant="small" color="textSecondary" accessibilityLiveRegion="polite">
        {state.message}
      </AppText>
    );
  }
  if (state.kind === "done") {
    return (
      <AppText accessibilityLiveRegion="polite">
        {state.translation ?? "Tradução da frase indisponível no momento."}
      </AppText>
    );
  }
  return null;
}

function SentenceContent({ sentence, ...props }: ContentProps & { sentence: string }) {
  const { state, request } = useSentenceTranslation(props);

  // a frase foi escolhida para ser traduzida: já pede ao abrir
  useEffect(() => {
    void request(sentence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence]);
  useEffect(() => () => void Speech.stop(), []);

  return (
    <View style={styles.content}>
      <AppText variant="overline" color="primary700" accessibilityRole="header">
        Frase
      </AppText>
      <View style={styles.sentenceRow}>
        <AppText variant="reading" style={styles.word}>
          {sentence}
        </AppText>
        <IconButton
          icon="volume-high-outline"
          color="primary600"
          accessibilityLabel="Ouvir a frase"
          onPress={() => speak(sentence)}
        />
      </View>
      <SentenceTranslationView state={state} />
      <AppText variant="caption" color="textSecondary">
        Dica: toque numa palavra para ver a tradução dela e salvá-la.
      </AppText>
    </View>
  );
}

function Content({
  selection: { word, sentence },
  token,
  articleId,
  onUnauthorized,
}: ContentProps & { selection: { word: string; sentence: string } }) {
  const sentenceTranslation = useSentenceTranslation({ token, articleId, onUnauthorized });
  // undefined = carregando; translation null = indisponível
  const [lookup, setLookup] = useState<Lookup | undefined>(undefined);
  // id da palavra salva (do lookup ou do salvar deste painel); null = não salva
  const [savedId, setSavedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // salva agora, neste painel: o ícone "pula" (recompensa imediata); já salva antes: sem festa
  const [justSaved, setJustSaved] = useState(false);

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

  // fechar o painel interrompe a fala
  useEffect(() => () => void Speech.stop(), []);

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
      setJustSaved(true);
      haptic.light();
    }, "Não foi possível salvar. Tente novamente.");

  const remove = () =>
    run(async (t) => {
      if (savedId === null) return;
      await deleteWord(t, savedId);
      setSavedId(null);
    }, "Não foi possível remover. Tente novamente.");

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <AppText variant="readingTitle" accessibilityRole="header" style={styles.word}>
          {word}
        </AppText>
        <IconButton
          icon="volume-high-outline"
          color="primary600"
          accessibilityLabel={`Ouvir a pronúncia de ${word}`}
          onPress={() => speak(word)}
        />
      </View>
      {lookup === undefined ? (
        <View accessible accessibilityLabel="Carregando tradução">
          <Skeleton height={24} width="60%" />
        </View>
      ) : lookup.translation ? (
        <AppText variant="h3">{lookup.translation}</AppText>
      ) : (
        <AppText color="textSecondary">Tradução indisponível no momento</AppText>
      )}
      <ContextSentence sentence={sentence} word={word} />
      {sentenceTranslation.state.kind === "idle" ? (
        <Button
          variant="ghost"
          icon="language-outline"
          title="Traduzir a frase"
          onPress={() => void sentenceTranslation.request(sentence)}
        />
      ) : (
        <SentenceTranslationView state={sentenceTranslation.state} />
      )}
      {error && (
        <AppText variant="small" color="errorText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      {savedId !== null ? (
        <View style={styles.saved}>
          <View style={styles.savedLabel}>
            <Animated.View entering={justSaved ? SAVED_POP : undefined}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success600} />
            </Animated.View>
            <AppText style={styles.semibold}>Palavra salva</AppText>
          </View>
          <Button variant="ghost" title="Remover" loading={busy} onPress={remove} />
        </View>
      ) : (
        <Button
          title="Salvar palavra"
          icon="bookmark-outline"
          loading={busy}
          disabled={lookup === undefined}
          onPress={save}
        />
      )}
    </View>
  );
}

const SAVED_POP = ZoomIn.springify()
  .damping(springs.pop.damping)
  .stiffness(springs.pop.stiffness)
  .mass(springs.pop.mass)
  .reduceMotion(springs.pop.reduceMotion);

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sentenceRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  word: { flex: 1 },
  saved: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  savedLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  semibold: { fontFamily: fontFamily.semibold },
});
