import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Attribution } from "@/components/attribution";
import { Button } from "@/components/button";
import { CompletionScreen } from "@/components/completion-screen";
import { IconButton } from "@/components/icon-button";
import { ProgressBar } from "@/components/progress-bar";
import { ReaderSettingsSheet } from "@/components/reader-settings-sheet";
import { WordPopup } from "@/components/word-popup";
import { ApiError } from "@/lib/api";
import { getArticle, listArticles, pickNextText, type ArticleDetail } from "@/lib/articles";
import { bookTitle } from "@/lib/books";
import { useAuth } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { getGoal, type GoalStatus } from "@/lib/preferences";
import { endState, scrollProgress, type EndState, type FinishAttempt } from "@/lib/reading";
import {
  READER_THEMES,
  bodyStyle,
  titleStyle,
  useReaderSettings,
  type ReaderTheme,
} from "@/lib/reader-settings";
import { getSummary } from "@/lib/stats";
import { useReadingSession } from "@/lib/use-reading-session";
import { chunkParagraph, sentenceText } from "@/lib/vocabulary";
import { colors, fontFamily, spacing } from "@/theme";

const READING_MAX_WIDTH = 680;

function goBack() {
  // aberto por deep link não há histórico: volta para as abas
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

// seleção no leitor: uma palavra (toque) ou a frase inteira (dedo segurado); o que vai ao WordPopup
type Selection = {
  paragraph: number;
  chunk: number; // bloco tocado
  sentenceIndex: number; // frase do bloco dentro do parágrafo
  word: string | null; // null = frase inteira
  sentence: string;
};

// Cada palavra é um bloco próprio (com a pontuação e o espaço em volta) numa linha que quebra
// sozinha: o toque pega a altura inteira da linha, em vez do contorno exato das letras de um
// trecho dentro de um texto só (que falhava em toques rápidos). Segurar escolhe a frase.
const Paragraph = memo(function Paragraph({
  text,
  index,
  selectedChunk,
  selectedSentence,
  onSelect,
  textStyle,
  markStyle,
}: {
  text: string;
  index: number;
  selectedChunk: number | null; // palavra grifada
  selectedSentence: number | null; // frase grifada
  onSelect: (selection: Selection) => void;
  // aparência escolhida no painel "Aa" (fonte, tamanho, cor do tema)
  textStyle: TextStyle;
  markStyle: TextStyle;
}) {
  const chunks = useMemo(() => chunkParagraph(text), [text]);
  return (
    // leitor de tela lê o parágrafo inteiro, não palavra por palavra
    <View style={styles.paragraph} accessible accessibilityLabel={text}>
      {chunks.map((chunk, i) => {
        // frase grifada: o bloco inteiro (grifo contínuo); palavra tocada: só ela, sem a pontuação
        const sentenceMarked = chunk.sentence === selectedSentence;
        const wordMarked = i === selectedChunk && !sentenceMarked;
        const select = (word: string | null) =>
          onSelect({
            paragraph: index,
            chunk: i,
            sentenceIndex: chunk.sentence,
            word,
            sentence: sentenceText(chunks, chunk.sentence),
          });
        return (
          <Text
            key={i}
            suppressHighlighting
            style={[textStyle, sentenceMarked && markStyle]}
            onPress={chunk.word === null ? undefined : () => select(chunk.word)}
            onLongPress={() => {
              // frase inteira escolhida: um toque firme confirma o gesto
              haptic.hold();
              select(null);
            }}
          >
            {wordMarked ? (
              <>
                {chunk.text.slice(0, chunk.start)}
                <Text style={markStyle}>{chunk.text.slice(chunk.start, chunk.end)}</Text>
                {chunk.text.slice(chunk.end)}
              </>
            ) : (
              chunk.text
            )}
          </Text>
        );
      })}
    </View>
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
  theme,
}: {
  state: EndState;
  finishing: boolean;
  onFinish: () => void;
  primaryAction: NavAction | null;
  secondaryAction: NavAction;
  theme: ReaderTheme;
}) {
  const text = { color: theme.text };
  const secondary = { color: theme.secondary };
  const end = [styles.end, { borderTopColor: theme.border }];
  if (state.kind === "done") {
    return (
      <View style={end}>
        <View style={styles.inline}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success600} />
          <AppText style={[styles.semibold, text]}>Você já concluiu este texto</AppText>
        </View>
        {primaryAction && (
          <Button title={primaryAction.label} onPress={primaryAction.onPress} />
        )}
        <Button
          // no tema escuro o "ghost" (texto índigo) não tem contraste: vira secondary (fundo claro)
          variant={primaryAction ? (theme.dark ? "secondary" : "ghost") : "primary"}
          title={secondaryAction.label}
          onPress={secondaryAction.onPress}
        />
      </View>
    );
  }
  return (
    <View style={end}>
      <AppText variant="h3" accessibilityRole="header" style={text}>
        Você chegou ao fim
      </AppText>
      <Button title="Concluir leitura" icon="checkmark" loading={finishing} onPress={onFinish} />
      {state.kind === "too-fast" && (
        <AppText
          variant="small"
          color="textSecondary"
          style={secondary}
          accessibilityLiveRegion="polite"
        >
          Você passou rápido por este texto. Para contar como lido, leia com calma: faltam cerca
          de {formatNumber(state.seconds)} {state.seconds === 1 ? "segundo" : "segundos"} de
          leitura.
        </AppText>
      )}
      {state.kind === "error" && (
        <AppText
          variant="small"
          color="textSecondary"
          style={secondary}
          accessibilityLiveRegion="polite"
        >
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
  const { settings, update: updateSettings } = useReaderSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = READER_THEMES[settings.theme];
  // estilos memorizados: os parágrafos (memo) só re-renderizam quando a aparência muda
  const paragraphStyle = useMemo(() => bodyStyle(settings), [settings]);
  const markStyle = useMemo(() => ({ backgroundColor: theme.mark }), [theme]);
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
      // sem lista: cai na aba Ler
    }
    router.navigate("/read");
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
      ? { label: "Ver mais textos", onPress: () => router.navigate("/read") }
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
    <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <View style={styles.topBar}>
        <IconButton
          icon="arrow-back"
          accessibilityLabel="Voltar"
          color={theme.dark ? "surface" : "textPrimary"}
          onPress={goBack}
        />
        {article && (
          <View style={styles.progress}>
            <ProgressBar value={progress} size="thin" />
          </View>
        )}
        {article && (
          <IconButton
            icon="text"
            accessibilityLabel="Aparência do texto"
            color={theme.dark ? "surface" : "textPrimary"}
            onPress={() => setSettingsOpen(true)}
          />
        )}
      </View>

      {notFound ? (
        <View style={styles.center}>
          <AppText style={{ color: theme.text }}>Texto não encontrado</AppText>
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
            <AppText variant="readingTitle" accessibilityRole="header" style={titleStyle(settings)}>
              {article.title}
            </AppText>
            <View style={styles.meta}>
              <AppText variant="small" color="textSecondary" style={{ color: theme.secondary }}>
                {[
                  article.book_title ? bookTitle(article.book_title) : article.category,
                  article.difficulty,
                  `${article.estimated_minutes} min`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </AppText>
              {done && (
                <View style={styles.inline}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success600} />
                  <AppText variant="small" style={[styles.semibold, { color: theme.text }]}>
                    Concluído
                  </AppText>
                </View>
              )}
            </View>
            <AppText variant="caption" style={[styles.hint, { color: theme.secondary }]}>
              Toque numa palavra para traduzir · segure para traduzir a frase
            </AppText>
            {paragraphs?.map((paragraph, index) => (
              <Paragraph
                key={index}
                text={paragraph}
                index={index}
                selectedChunk={
                  selection?.paragraph === index && selection.word !== null ? selection.chunk : null
                }
                selectedSentence={
                  selection?.paragraph === index && selection.word === null
                    ? selection.sentenceIndex
                    : null
                }
                onSelect={setSelection}
                textStyle={paragraphStyle}
                markStyle={markStyle}
              />
            ))}
            {article.attribution && (
              <Attribution
                text={article.attribution}
                url={article.source_url}
                textColor={theme.secondary}
                linkColor={theme.link}
              />
            )}
            <TextEnd
              state={endState(done, attempt)}
              finishing={finishing}
              onFinish={() => void onFinish()}
              primaryAction={primaryAction}
              secondaryAction={secondaryAction}
              theme={theme}
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
      <ReaderSettingsSheet
        visible={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
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
    marginBottom: spacing.sm,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  paragraph: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg },
  hint: { marginBottom: spacing.xl },
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
