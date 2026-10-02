import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { memo, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Attribution } from "@/components/attribution";
import { Button } from "@/components/button";
import { CompletionScreen } from "@/components/completion-screen";
import { IconButton } from "@/components/icon-button";
import { ProgressBar } from "@/components/progress-bar";
import { WordPopup } from "@/components/word-popup";
import { ApiError } from "@/lib/api";
import { getArticle, listArticles, pickNextText, type ArticleDetail } from "@/lib/articles";
import { useAuth } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { getGoal, type GoalStatus } from "@/lib/preferences";
import { endState, scrollProgress, type EndState, type FinishAttempt } from "@/lib/reading";
import { getSummary } from "@/lib/stats";
import { useReadingSession } from "@/lib/use-reading-session";
import { sentenceOf, tokenize } from "@/lib/vocabulary";
import { colors, fontFamily, spacing } from "@/theme";

const READING_MAX_WIDTH = 680;

function goBack() {
  // aberto por deep link não há histórico: volta para as abas
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

// palavra tocada: onde está (parágrafo e trecho) e o que vai para o WordPopup
type Selection = { paragraph: number; piece: number; word: string; sentence: string };

// Um parágrafo continua um único texto corrido; cada palavra é um trecho tocável dentro dele.
// A palavra tocada fica grifada enquanto o painel está aberto.
const Paragraph = memo(function Paragraph({
  text,
  index,
  selectedPiece,
  onSelect,
}: {
  text: string;
  index: number;
  selectedPiece: number | null;
  onSelect: (selection: Selection) => void;
}) {
  return (
    <AppText variant="reading" style={styles.paragraph}>
      {tokenize(text).map((piece, i) => {
        const word = piece.word;
        if (word === null) return piece.text;
        return (
          <Text
            key={i}
            suppressHighlighting
            style={i === selectedPiece && styles.marked}
            onPress={() =>
              onSelect({ paragraph: index, piece: i, word, sentence: sentenceOf(text, i) })
            }
          >
            {piece.text}
          </Text>
        );
      })}
    </AppText>
  );
});

// Fim do texto: "Concluir leitura" (a pessoa marca a conclusão; o servidor valida), a resposta
// gentil quando foi rápido demais, ou "Você já concluiu este texto" com as ações.
function TextEnd({
  state,
  finishing,
  onFinish,
  primaryAction,
  secondaryAction,
}: {
  state: EndState;
  finishing: boolean;
  onFinish: () => void;
  primaryAction: NavAction | null;
  secondaryAction: NavAction;
}) {
  if (state.kind === "done") {
    return (
      <View style={styles.end}>
        <View style={styles.inline}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success600} />
          <AppText style={styles.semibold}>Você já concluiu este texto</AppText>
        </View>
        {primaryAction && (
          <Button title={primaryAction.label} onPress={primaryAction.onPress} />
        )}
        <Button
          variant={primaryAction ? "ghost" : "primary"}
          title={secondaryAction.label}
          onPress={secondaryAction.onPress}
        />
      </View>
    );
  }
  return (
    <View style={styles.end}>
      <AppText variant="h3" accessibilityRole="header">
        Você chegou ao fim
      </AppText>
      <Button title="Concluir leitura" icon="checkmark" loading={finishing} onPress={onFinish} />
      {state.kind === "too-fast" && (
        <AppText variant="small" color="textSecondary" accessibilityLiveRegion="polite">
          Você passou rápido por este texto. Para contar como lido, leia com calma: faltam cerca
          de {formatNumber(state.seconds)} {state.seconds === 1 ? "segundo" : "segundos"} de
          leitura.
        </AppText>
      )}
      {state.kind === "error" && (
        <AppText variant="small" color="textSecondary" accessibilityLiveRegion="polite">
          Não foi possível confirmar agora. Tente de novo.
        </AppText>
      )}
    </View>
  );
}

type NavAction = { label: string; onPress: () => void };

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = Number(id);
  const validId = Number.isInteger(articleId) && articleId > 0;
  const { token, user, signOut } = useAuth();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);
  // conclusão marcada pelo toque em "Concluir leitura" (o servidor valida)
  const [finishedHere, setFinishedHere] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [attempt, setAttempt] = useState<FinishAttempt>(null);
  const [celebration, setCelebration] = useState<{
    goal: GoalStatus | null;
    longest: number | null;
  } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scroll = useRef({ offset: 0, content: 0, viewport: 0, resumed: false });
  const { gains, reportProgress, finish } = useReadingSession({
    token,
    articleId,
    enabled: article !== null,
    initialProgress: article?.progress ?? 0,
    onUnauthorized: signOut,
  });

  useEffect(() => {
    if (!token || !validId) return;
    let active = true;
    getArticle(token, articleId)
      .then((result) => {
        if (active) setArticle(result);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) void signOut();
        else if (active)
          setError(
            e instanceof ApiError && e.status === 404
              ? { message: e.detail, notFound: true }
              : {
                  message: e instanceof ApiError ? e.detail : "Não foi possível abrir o texto.",
                  notFound: false,
                },
          );
      });
    return () => {
      active = false;
    };
  }, [token, articleId, validId, reloadKey, signOut]);

  function updateProgress() {
    const { offset, content, viewport } = scroll.current;
    if (!content || !viewport) return;
    const value = scrollProgress(offset, content, viewport);
    reportProgress(value * 100);
    // arredonda para 1%: o estado só muda (e re-renderiza) quando a barra muda de fato
    setProgress(Math.round(value * 100) / 100);
  }

  // retoma de onde parou, uma vez, quando conteúdo e tela já foram medidos
  function resumeOnce() {
    const s = scroll.current;
    if (s.resumed || !s.content || !s.viewport || !article) return;
    s.resumed = true;
    if (article.progress > 0 && !article.completed) {
      s.offset = ((s.content - s.viewport) * article.progress) / 100;
      scrollRef.current?.scrollTo({ y: s.offset, animated: false });
    }
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    scroll.current.offset = contentOffset.y;
    scroll.current.content = contentSize.height;
    scroll.current.viewport = layoutMeasurement.height;
    updateProgress();
  }

  function retry() {
    setError(null);
    setReloadKey((k) => k + 1);
  }

  // "Concluir leitura": envio imediato (progresso 100 + segundos acumulados) e a resposta decide
  async function onFinish() {
    if (!token || !article) return;
    setFinishing(true);
    setAttempt(null);
    try {
      const response = await finish();
      if (!response.completed) {
        setAttempt({ kind: "too-fast", wordCount: article.word_count, wordsRead: response.words_read });
        return;
      }
      // dados da meta e do recorde para a tela cheia; falha só esconde essas partes
      const [goal, summary] = await Promise.all([
        getGoal(token).catch(() => null),
        getSummary(token).catch(() => null),
      ]);
      setFinishedHere(true);
      setCelebration({ goal, longest: summary?.streak_longest ?? null });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) void signOut();
      else setAttempt({ kind: "error" });
    } finally {
      setFinishing(false);
    }
  }

  async function openNextText() {
    if (!token) return;
    try {
      const level = user?.english_level ?? undefined;
      const next = pickNextText(await listArticles(token, level), articleId);
      if (next) {
        router.replace({ pathname: "/article/[id]", params: { id: String(next.id) } });
        return;
      }
    } catch {
      // sem lista: cai no Explorar
    }
    router.navigate("/explore");
  }

  const notFound = !validId || error?.notFound;
  const done = !!article?.completed || finishedHere;
  const bookId = article?.book_id ?? null;
  const nextChapter = article?.next_article_id ?? null;
  const primaryAction: NavAction | null =
    bookId === null
      ? { label: "Próximo texto", onPress: () => void openNextText() }
      : nextChapter !== null
        ? {
            label: "Próximo capítulo",
            onPress: () =>
              router.replace({ pathname: "/article/[id]", params: { id: String(nextChapter) } }),
          }
        : null;
  const secondaryAction: NavAction =
    bookId === null
      ? { label: "Voltar ao Explorar", onPress: () => router.navigate("/explore") }
      : {
          label: "Voltar ao livro",
          onPress: () =>
            router.navigate({ pathname: "/book/[id]", params: { id: String(bookId) } }),
        };
  const paragraphs = article?.content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-back" accessibilityLabel="Voltar" onPress={goBack} />
        {article && (
          <View style={styles.progress}>
            <ProgressBar value={progress} size="thin" />
          </View>
        )}
      </View>

      {notFound ? (
        <View style={styles.center}>
          <AppText>Texto não encontrado</AppText>
          <Button variant="secondary" title="Voltar" onPress={goBack} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppText color="errorText" style={styles.centerText}>
            {error.message}
          </AppText>
          <Button title="Tentar novamente" onPress={retry} />
        </View>
      ) : !article ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary500} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={(e) => {
            scroll.current.viewport = e.nativeEvent.layout.height;
            resumeOnce();
            updateProgress();
          }}
          onContentSizeChange={(_, height) => {
            scroll.current.content = height;
            resumeOnce();
            updateProgress();
          }}
        >
          <View style={styles.column}>
            <AppText variant="h1" accessibilityRole="header">
              {article.title}
            </AppText>
            <View style={styles.meta}>
              <AppText variant="small" color="textSecondary">
                {[article.category, article.difficulty, `${article.estimated_minutes} min`]
                  .filter(Boolean)
                  .join(" · ")}
              </AppText>
              {done && (
                <View style={styles.inline}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success600} />
                  <AppText variant="small" style={styles.semibold}>
                    Concluído
                  </AppText>
                </View>
              )}
            </View>
            {paragraphs?.map((paragraph, index) => (
              <Paragraph
                key={index}
                text={paragraph}
                index={index}
                selectedPiece={selection?.paragraph === index ? selection.piece : null}
                onSelect={setSelection}
              />
            ))}
            {article.attribution && (
              <Attribution text={article.attribution} url={article.source_url} />
            )}
            <TextEnd
              state={endState(done, attempt)}
              finishing={finishing}
              onFinish={() => void onFinish()}
              primaryAction={primaryAction}
              secondaryAction={secondaryAction}
            />
          </View>
        </ScrollView>
      )}
      {article && (
        <CompletionScreen
          visible={celebration !== null}
          onClose={() => setCelebration(null)}
          articleTitle={article.title}
          minutes={article.estimated_minutes}
          gains={gains}
          goal={celebration?.goal ?? null}
          longestStreak={celebration?.longest ?? null}
          primaryAction={
            primaryAction && {
              label: primaryAction.label,
              onPress: () => {
                setCelebration(null);
                primaryAction.onPress();
              },
            }
          }
          secondaryAction={{
            label: secondaryAction.label,
            onPress: () => {
              setCelebration(null);
              secondaryAction.onPress();
            },
          }}
          onFinishForToday={() => {
            setCelebration(null);
            router.navigate("/");
          }}
        />
      )}
      <WordPopup
        selection={selection}
        token={token}
        articleId={articleId}
        onClose={() => setSelection(null)}
        onUnauthorized={signOut}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingRight: spacing.xl,
  },
  progress: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  centerText: { textAlign: "center" },
  scroll: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  column: { width: "100%", maxWidth: READING_MAX_WIDTH },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  paragraph: { marginBottom: spacing.lg },
  marked: { backgroundColor: colors.primary100 },
  // fim do texto: separado do último parágrafo por uma divisória, sem cara de gamificação
  end: {
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  semibold: { fontFamily: fontFamily.semibold },
});
