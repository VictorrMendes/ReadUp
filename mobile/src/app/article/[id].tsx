import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { IconButton } from "@/components/icon-button";
import { ProgressBar } from "@/components/progress-bar";
import { ApiError } from "@/lib/api";
import { getArticle, type ArticleDetail } from "@/lib/articles";
import { useAuth } from "@/lib/auth";
import { scrollProgress } from "@/lib/reading";
import { useReadingSession } from "@/lib/use-reading-session";
import { colors, spacing } from "@/theme";

const READING_MAX_WIDTH = 680;

function goBack() {
  // aberto por deep link não há histórico: volta para as abas
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = Number(id);
  const validId = Number.isInteger(articleId) && articleId > 0;
  const { token, signOut } = useAuth();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scroll = useRef({ offset: 0, content: 0, viewport: 0, resumed: false });
  const { result, reportProgress } = useReadingSession({
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

  const notFound = !validId || error?.notFound;
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
          <AppText color="error" style={styles.centerText}>
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
            <AppText variant="small" color="textSecondary" style={styles.meta}>
              {[article.category, article.difficulty, `${article.estimated_minutes} min`]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
            {paragraphs?.map((paragraph, index) => (
              <AppText key={index} variant="reading" style={styles.paragraph}>
                {paragraph}
              </AppText>
            ))}
            {(article.completed || result?.completed) && (
              <Card style={styles.done}>
                <AppText variant="h3">Leitura concluída</AppText>
                <AppText color="textSecondary">{article.word_count} palavras lidas</AppText>
              </Card>
            )}
          </View>
        </ScrollView>
      )}
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
  meta: { marginTop: spacing.sm, marginBottom: spacing.xl },
  paragraph: { marginBottom: spacing.lg },
  done: { gap: spacing.xs, marginTop: spacing.lg },
});
