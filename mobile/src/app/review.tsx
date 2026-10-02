import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { ContextSentence } from "@/components/context-sentence";
import { IconButton } from "@/components/icon-button";
import { ProgressBar } from "@/components/progress-bar";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { easings, enterFrom } from "@/lib/motion";
import {
  advance,
  currentItem,
  firstPassTotal,
  startSession,
  type ReviewSession,
} from "@/lib/review-session";
import { speak } from "@/lib/speech";
import { answerReview, getReviewQueue, type ReviewQueue } from "@/lib/vocabulary";
import { colors, spacing } from "@/theme";

// meia volta do cartão (ms): na metade ele está de lado e a face troca
const HALF_FLIP = 150;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace("/vocabulary");
}

/** Revisão espaçada das palavras salvas: cartão, tradução, "ainda aprendendo" ou "já sei". */
export default function ReviewScreen() {
  const { token, signOut } = useAuth();
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sending, setSending] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${rotation.get()}deg` }],
  }));

  useEffect(
    () => () => {
      if (flipTimer.current) clearTimeout(flipTimer.current);
    },
    [],
  );

  /** Vira o cartão: gira até ficar de lado, troca para o verso (tradução) e volta de frente. */
  function reveal() {
    if (flipTimer.current) return; // já virando: um toque duplo não reinicia o giro
    if (reduceMotion) {
      setRevealed(true);
      return;
    }
    rotation.set(
      withSequence(
        withTiming(90, { duration: HALF_FLIP, easing: easings.exit }),
        withTiming(0, { duration: HALF_FLIP, easing: easings.enter }),
      ),
    );
    flipTimer.current = setTimeout(() => {
      flipTimer.current = null;
      setRevealed(true);
    }, HALF_FLIP);
  }

  useEffect(() => {
    if (!token) return;
    let active = true;
    getReviewQueue(token)
      .then((result) => {
        if (!active) return;
        setQueue(result);
        setSession(startSession(result.cards));
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) void signOut();
        else if (active) setLoadError("Não foi possível carregar a revisão.");
      });
    return () => {
      active = false;
    };
  }, [token, reloadKey, signOut]);

  const item = session ? currentItem(session) : null;

  async function answer(known: boolean) {
    if (!session || !item || !token || sending) return;
    // treino extra: a palavra já voltou para a caixa 0 no servidor, só avança aqui
    if (item.practice) {
      setSession(advance(session, known));
      setRevealed(false);
      return;
    }
    setSending(true);
    setAnswerError(null);
    try {
      const result = await answerReview(token, item.card.id, known);
      // acerto ganha um toque de sucesso; "ainda aprendendo" não vibra (sem punição)
      if (known) haptic.success();
      setSession(advance(session, known, result.xp_gained));
      setRevealed(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) void signOut();
      // 409: já respondida ou limite do dia (ex.: outro aparelho); segue sem contar
      else if (e instanceof ApiError && e.status === 409) {
        setSession(advance(session, known));
        setRevealed(false);
      } else setAnswerError("Não foi possível salvar a resposta. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  const total = session ? session.items.length : 0;
  const firstPass = session ? firstPassTotal(session) : 0;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <IconButton icon="close" accessibilityLabel="Fechar revisão" onPress={close} />
        {session && total > 0 && (
          <View style={styles.progress}>
            <ProgressBar value={session.index / total} size="thin" />
          </View>
        )}
      </View>

      {loadError ? (
        <View style={styles.center}>
          <AppText color="errorText" style={styles.centerText}>
            {loadError}
          </AppText>
          <Button
            title="Tentar novamente"
            onPress={() => {
              setLoadError(null);
              setReloadKey((k) => k + 1);
            }}
          />
        </View>
      ) : !session || !queue ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary500} />
        </View>
      ) : item ? (
        <ScrollView contentContainerStyle={styles.content}>
          <AppText variant="small" color="textSecondary">
            {item.practice
              ? "Treino extra"
              : `${Math.min(session.index + 1, firstPass)} de ${firstPass}`}
          </AppText>
          {/* cada cartão novo entra subindo; a key reinicia a entrada a cada palavra */}
          <Animated.View key={session.index} entering={enterFrom(0)} style={cardStyle}>
            <Card style={styles.card}>
              <View style={styles.wordRow}>
                <AppText variant="readingTitle" accessibilityRole="header" style={styles.word}>
                  {item.card.word}
                </AppText>
                <IconButton
                  icon="volume-high-outline"
                  color="primary600"
                  accessibilityLabel={`Ouvir a pronúncia de ${item.card.word}`}
                  onPress={() => speak(item.card.word)}
                />
              </View>
              {item.card.context && (
                <ContextSentence sentence={item.card.context} word={item.card.word} />
              )}
              {revealed &&
                (item.card.translation ? (
                  <AppText variant="h3" accessibilityLiveRegion="polite">
                    {item.card.translation}
                  </AppText>
                ) : (
                  <AppText color="textSecondary" accessibilityLiveRegion="polite">
                    Sem tradução salva
                  </AppText>
                ))}
            </Card>
          </Animated.View>

          {answerError && (
            <AppText variant="small" color="errorText" accessibilityLiveRegion="polite">
              {answerError}
            </AppText>
          )}
          {revealed ? (
            <View style={styles.answers}>
              <Button
                variant="secondary"
                title="Ainda aprendendo"
                disabled={sending}
                onPress={() => void answer(false)}
              />
              <Button title="Já sei" loading={sending} onPress={() => void answer(true)} />
            </View>
          ) : (
            <Button title="Mostrar tradução" onPress={reveal} />
          )}
        </ScrollView>
      ) : (
        <Summary session={session} queue={queue} />
      )}
    </SafeAreaView>
  );
}

function Summary({ session, queue }: { session: ReviewSession; queue: ReviewQueue }) {
  const empty = session.items.length === 0;
  const limitReached = empty && queue.reviewed_today >= queue.daily_limit;

  // fim de uma sessão de verdade: comemora com um toque (sessão vazia não é conquista)
  useEffect(() => {
    if (!empty) haptic.success();
  }, [empty]);

  return (
    <Animated.View entering={enterFrom(0)} style={styles.center}>
      <Image
        source={require("@/assets/images/mascot.png")}
        style={styles.art}
        accessible={false}
        accessibilityIgnoresInvertColors
      />
      <AppText variant="h2" accessibilityRole="header" style={styles.centerText}>
        {empty ? "Nada para revisar agora" : "Revisão concluída"}
      </AppText>
      <AppText color="textSecondary" style={styles.centerText}>
        {empty
          ? limitReached
            ? `Você já revisou ${queue.daily_limit} palavras hoje. Volte amanhã!`
            : "Palavras salvas entram na revisão no dia seguinte."
          : `${session.known} já sabia · ${session.learning} ainda aprendendo`}
      </AppText>
      {session.xp > 0 && <Badge tone="primary" label={`+${formatNumber(session.xp)} XP`} />}
      <Button title="Voltar ao vocabulário" onPress={close} />
    </Animated.View>
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
  content: { padding: spacing.xl, gap: spacing.lg },
  card: { gap: spacing.lg },
  wordRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  word: { flex: 1 },
  answers: { gap: spacing.md },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  centerText: { textAlign: "center" },
  art: { width: 160, height: 160 },
});
