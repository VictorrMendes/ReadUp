import Ionicons from "@expo/vector-icons/Ionicons";
import { useContext, useEffect, useRef, useState, type ComponentProps } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Reanimated from "react-native-reanimated";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { achievementIcon } from "@/components/achievement-badge";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Confetti } from "@/components/confetti";
import { CountUp } from "@/components/count-up";
import { GoalRing } from "@/components/goal-ring";
import { IconButton } from "@/components/icon-button";
import { formatDays, formatNumber } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { durations, enterFrom } from "@/lib/motion";
import type { GoalStatus } from "@/lib/preferences";
import type { SessionGains } from "@/lib/use-reading-session";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { colors, fontFamily, motion, radius, spacing, type ColorToken } from "@/theme";

const PHRASES = ["Mais um texto lido!", "Mandou bem!", "Leitura concluída"];
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 66, 100, 365];
const MAX_ACHIEVEMENT_CARDS = 2;

/** Título da conclusão: marco de ofensiva quando a meta virou hoje; senão uma das 3 frases. */
export function completionTitle(streak: number, goalMet: boolean, pick: number): string {
  if (goalMet && STREAK_MILESTONES.includes(streak)) return `${streak} dias seguidos!`;
  return PHRASES[Math.floor(pick * PHRASES.length) % PHRASES.length];
}

/**
 * Frase dos marcos grandes da ofensiva (dia em que a meta virou). 66 dias = tempo médio para um
 * hábito se firmar (Lally et al., 2010). Fala do hábito, não do número.
 */
export function milestoneNote(streak: number): string | null {
  switch (streak) {
    case 7:
      return "Uma semana inteira lendo em inglês.";
    case 30:
      return "Um mês: ler já faz parte do seu dia.";
    case 66:
      return "66 dias: o tempo médio para um hábito se firmar.";
    case 100:
      return "100 dias de leitura. Poucos chegam aqui.";
    case 365:
      return "Um ano inteiro lendo. Que jornada!";
    default:
      return null;
  }
}

type Action = { label: string; onPress: () => void };

type Props = {
  visible: boolean;
  onClose: () => void; // "Fechar": volta ao texto
  articleTitle: string;
  minutes: number; // tempo estimado de leitura do texto
  gains: SessionGains;
  goal: GoalStatus | null; // meta depois da conclusão (null enquanto carrega ou se falhou)
  longestStreak: number | null;
  primaryAction: Action | null; // "Próximo texto" / "Próximo capítulo" (null: último capítulo)
  secondaryAction: Action; // "Ver mais textos" / "Voltar ao livro"
  // "Terminar por hoje" (com a meta cumprida): um fim positivo em vez de "mais um" (pico-fim)
  onFinishForToday?: () => void;
};

// Tela cheia de conclusão (design-v3 5.4): o pico da leitura, aberto só pelo "Concluir leitura".
// Sequência de ≤ 1,4 s; tocar em qualquer lugar pula para o fim; com "reduzir movimento", tudo
// aparece no valor final.
export function CompletionScreen(props: Props) {
  return (
    <Modal
      visible={props.visible}
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      {props.visible && <Content {...props} />}
    </Modal>
  );
}

// ordem da sequência: 0 ilustração, 1 título, 2-4 tiles, 5 meta, 6 ofensiva, 7 conquistas
const STEPS = 8;
const DELAYS = [0, 120, 200, 260, 320, 500, 900, 1100];

function Content({
  onClose,
  articleTitle,
  minutes,
  gains,
  goal,
  longestStreak,
  primaryAction,
  secondaryAction,
  onFinishForToday,
}: Props) {
  const insets = useContext(SafeAreaInsetsContext);
  const reduceMotion = useReduceMotion();
  const [steps] = useState(() => Array.from({ length: STEPS }, () => new Animated.Value(0)));
  const [skipped, setSkipped] = useState(false);
  const [pick] = useState(() => Math.random());
  const titleRef = useRef<Text>(null);

  const title = completionTitle(gains.streak, gains.goalMet, pick);
  const shownAchievements = gains.achievements.slice(0, MAX_ACHIEVEMENT_CARDS);
  const moreAchievements = gains.achievements.length - shownAchievements.length;

  // meta: barra do valor de antes desta sessão até o de agora
  const target = goal?.target ?? null;
  const endFraction = target ? Math.min(1, (goal?.words_today ?? 0) / target) : 0;
  const startFraction = target
    ? Math.min(1, Math.max(0, ((goal?.words_today ?? 0) - gains.words) / target))
    : 0;
  const alreadyMet = startFraction >= 1;
  // a meta vira nesta leitura: anel fica verde, confete e háptica de sucesso nesse instante
  const willCross = target !== null && !alreadyMet && endFraction >= 1;
  const [finished, setFinished] = useState(false);
  const animateRing = reduceMotion === false && !skipped;
  // o tempo do anel chegou a 100% (só com animação; sem ela, já cruza direto)
  const [ringFull, setRingFull] = useState(false);
  const crossed = alreadyMet || (willCross && (ringFull || reduceMotion === true || skipped));
  const milestone = gains.goalMet ? milestoneNote(gains.streak) : null;

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion || skipped) {
      steps.forEach((step) => {
        step.stopAnimation();
        step.setValue(1);
      });
      return;
    }
    const animations = steps.map((step, i) => {
      const pop = i === 0 || i === 6 || i === 7; // ilustração, chama e medalha: spring
      const animation = pop
        ? Animated.spring(step, { toValue: 1, ...motion.pop, useNativeDriver: true })
        : Animated.timing(step, {
            toValue: 1,
            duration: i === 5 ? motion.count : i === 0 ? motion.slow : motion.base,
            easing: motion.easing,
            useNativeDriver: true,
          });
      return Animated.sequence([Animated.delay(DELAYS[i]), animation]);
    });
    const all = Animated.parallel(animations);
    all.start();
    return () => all.stop();
  }, [steps, reduceMotion, skipped]);

  // o anel troca para verde quando passa de 100% (tempo aproximado: o anel desacelera)
  useEffect(() => {
    if (!willCross || !animateRing) return;
    const share = (1 - startFraction) / Math.max(0.001, endFraction - startFraction);
    const id = setTimeout(() => setRingFull(true), DELAYS[5] + durations.progress * share * 0.7);
    return () => clearTimeout(id);
  }, [willCross, animateRing, startFraction, endFraction]);

  useEffect(() => {
    if (crossed && willCross) haptic.success();
  }, [crossed, willCross]);

  // um anúncio com tudo, e o foco no título
  useEffect(() => {
    const parts = [
      "Leitura concluída",
      gains.xp > 0 ? `Mais ${formatNumber(gains.xp)} pontos de experiência` : null,
      gains.words > 0 ? `${formatNumber(gains.words)} palavras` : null,
      gains.goalMet ? "Meta de hoje cumprida" : null,
      gains.goalMet ? `Ofensiva: ${formatDays(gains.streak)}` : null,
      gains.achievements.length
        ? `Conquista: ${gains.achievements.map((a) => a.title).join(", ")}`
        : null,
    ];
    AccessibilityInfo.announceForAccessibility(parts.filter(Boolean).join(". "));
    if (titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current, "focus");
    // só ao abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fade = (i: number, rise: number) => ({
    opacity: steps[i].interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
    transform: [
      { translateY: steps[i].interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) },
    ],
  });

  return (
    <View
      style={[styles.screen, { paddingTop: insets?.top ?? 0 }]}
      // tocar em qualquer lugar pula a sequência (sem bloquear os botões)
      onTouchStart={() => setSkipped(true)}
    >
      <View style={styles.topBar}>
        <IconButton icon="close" accessibilityLabel="Fechar" onPress={onClose} />
      </View>

      {finished ? (
        <Goodbye streak={gains.streak} goalMet={goal?.completed ?? gains.goalMet} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Animated.Image
              source={require("../../assets/images/celebrate.png")}
              style={[
                styles.illustration,
                {
                  opacity: steps[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                    extrapolate: "clamp",
                  }),
                  transform: [
                    { scale: steps[0].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  ],
                },
              ]}
              accessibilityIgnoresInvertColors
              accessible={false}
            />
            <Animated.View style={[styles.headerText, fade(1, 8)]}>
              <AppText ref={titleRef} variant="h1" accessibilityRole="header" style={styles.center}>
                {title}
              </AppText>
              <AppText color="textSecondary" style={styles.center} numberOfLines={2}>
                {articleTitle}
              </AppText>
            </Animated.View>
          </View>

          <View style={styles.tiles}>
            <Animated.View style={[styles.tileWrap, fade(2, 12)]}>
              <Tile icon="flash" iconColor="gold600" background="gold50" border="gold100">
                <CountUp
                  to={gains.xp}
                  prefix="+"
                  color="gold700"
                  reduceMotion={reduceMotion}
                  skipped={skipped}
                  delay={300}
                />
                <AppText variant="caption" color="gold700">
                  XP
                </AppText>
              </Tile>
            </Animated.View>
            <Animated.View style={[styles.tileWrap, fade(3, 12)]}>
              <Tile icon="book" iconColor="primary600" background="primary50" border="primary200">
                <CountUp
                  to={gains.words}
                  color="primary700"
                  reduceMotion={reduceMotion}
                  skipped={skipped}
                  delay={360}
                />
                <AppText variant="caption" color="primary700">
                  palavras
                </AppText>
              </Tile>
            </Animated.View>
            <Animated.View style={[styles.tileWrap, fade(4, 12)]}>
              <Tile icon="time-outline" iconColor="textSecondary" background="surface" border="border">
                <AppText variant="stat">{formatNumber(minutes)} min</AppText>
                <AppText variant="caption" color="textSecondary">
                  de leitura
                </AppText>
              </Tile>
            </Animated.View>
          </View>

          {target !== null && goal && (
            <Animated.View
              style={[styles.card, styles.goalCard, crossed ? styles.goalDone : styles.goalOpen, fade(5, 12)]}
              accessible
              accessibilityLabel={
                goal.completed
                  ? `Meta de hoje cumprida: ${formatNumber(goal.words_today)} de ${formatNumber(target)} palavras`
                  : `Faltam ${formatNumber(goal.remaining)} palavras para a meta de hoje`
              }
            >
              <GoalRing
                from={startFraction}
                to={endFraction}
                size={64}
                color={crossed ? colors.success500 : colors.primary500}
                animate={animateRing}
                delay={DELAYS[5]}
              >
                {crossed ? (
                  <Ionicons name="checkmark" size={26} color={colors.success600} />
                ) : (
                  <AppText variant="small" style={styles.semibold}>
                    {Math.round(endFraction * 100)}%
                  </AppText>
                )}
              </GoalRing>
              <View style={styles.flex}>
                <AppText variant="small" style={styles.semibold}>
                  {crossed ? "Meta de hoje cumprida" : `Faltam ${formatNumber(goal.remaining)} palavras`}
                </AppText>
                <AppText
                  variant="small"
                  color={crossed ? "success700" : "textSecondary"}
                  style={styles.semibold}
                >
                  {formatNumber(goal.words_today)} / {formatNumber(target)}
                </AppText>
              </View>
            </Animated.View>
          )}

          {gains.goalMet && (
            <View
              style={[styles.card, styles.streakCard]}
              accessible
              accessibilityLabel={[
                `${formatDays(gains.streak)} de ofensiva`,
                streakNote(gains.streak, longestStreak),
                milestone,
              ]
                .filter(Boolean)
                .join(". ")}
            >
              <Animated.Image
                source={require("../../assets/images/streak.png")}
                style={[
                  styles.flame,
                  {
                    transform: [
                      {
                        scale: steps[6].interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1.15, 1],
                        }),
                      },
                    ],
                  },
                ]}
                accessibilityIgnoresInvertColors
                accessible={false}
              />
              <View style={styles.flex}>
                <View style={styles.flipBox}>
                  {/* o número antigo sobe e sai; o novo entra de baixo (+1) */}
                  <Animated.View
                    style={[
                      styles.flipLayer,
                      {
                        opacity: steps[6].interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                        transform: [
                          {
                            translateY: steps[6].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -16],
                            }),
                          },
                        ],
                      },
                    ]}
                    importantForAccessibility="no-hide-descendants"
                  >
                    <AppText variant="h3">{formatDays(Math.max(0, gains.streak - 1))} de ofensiva</AppText>
                  </Animated.View>
                  <Animated.View
                    style={{
                      opacity: steps[6].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                        extrapolate: "clamp",
                      }),
                      transform: [
                        {
                          translateY: steps[6].interpolate({
                            inputRange: [0, 1],
                            outputRange: [16, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <AppText variant="h3">{formatDays(gains.streak)} de ofensiva</AppText>
                  </Animated.View>
                </View>
                <AppText variant="small" color="streak700">
                  {streakNote(gains.streak, longestStreak)}
                </AppText>
                {milestone && (
                  <AppText variant="small" style={styles.semibold}>
                    {milestone}
                  </AppText>
                )}
              </View>
            </View>
          )}

          {shownAchievements.map((achievement) => (
            <Animated.View
              key={achievement.id}
              style={[styles.card, styles.achievementCard, fade(7, 16)]}
              accessible
              accessibilityLabel={`Conquista desbloqueada: ${achievement.title}`}
            >
              <Animated.View
                style={[
                  styles.medal,
                  {
                    transform: [
                      {
                        rotate: steps[7].interpolate({
                          inputRange: [0, 1],
                          outputRange: ["-8deg", "0deg"],
                        }),
                      },
                      { scale: steps[7].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                    ],
                  },
                ]}
              >
                <Ionicons name={achievementIcon(achievement.icon)} size={24} color={colors.gold700} />
              </Animated.View>
              <View style={styles.flex}>
                <AppText variant="overline" color="gold700">
                  Conquista desbloqueada
                </AppText>
                <AppText variant="h3">{achievement.title}</AppText>
              </View>
            </Animated.View>
          ))}
          {moreAchievements > 0 && (
            <AppText variant="small" color="gold700" style={[styles.center, styles.semibold]}>
              +{moreAchievements} {moreAchievements === 1 ? "conquista" : "conquistas"}
            </AppText>
          )}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: (insets?.bottom ?? 0) + spacing.md }]}>
        {finished && onFinishForToday ? (
          <Button title="Voltar ao início" onPress={onFinishForToday} style={styles.primary} />
        ) : (
          <>
            <Button
              title={(primaryAction ?? secondaryAction).label}
              onPress={(primaryAction ?? secondaryAction).onPress}
              style={styles.primary}
            />
            <View style={styles.secondaryRow}>
              {primaryAction && (
                <Button
                  variant="ghost"
                  title={secondaryAction.label}
                  onPress={secondaryAction.onPress}
                  style={styles.secondary}
                />
              )}
              {onFinishForToday && goal?.completed && (
                <Button
                  variant="ghost"
                  title="Terminar por hoje"
                  onPress={() => setFinished(true)}
                  style={styles.secondary}
                />
              )}
            </View>
          </>
        )}
      </View>

      <Confetti active={crossed && willCross} animate={reduceMotion === false && !skipped} />
    </View>
  );
}

/** Fim positivo da sessão: o "até amanhã" que fecha o dia no alto (regra do pico-fim). */
function Goodbye({ streak, goalMet }: { streak: number; goalMet: boolean }) {
  return (
    <Reanimated.View entering={enterFrom(0)} style={styles.goodbye}>
      <Image
        source={require("../../assets/images/mascot.png")}
        style={styles.illustration}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <AppText variant="h1" accessibilityRole="header" style={styles.center}>
        Até amanhã!
      </AppText>
      <AppText color="textSecondary" style={styles.center}>
        {goalMet
          ? `Meta cumprida e ofensiva de ${formatDays(streak)} garantida. Descansar também faz parte.`
          : "Boa leitura hoje. Descansar também faz parte."}
      </AppText>
    </Reanimated.View>
  );
}

function streakNote(streak: number, longest: number | null): string {
  if (longest === null) return "+1 hoje";
  if (streak >= longest) return "Novo recorde!";
  return `+1 hoje · faltam ${formatDays(longest - streak)} para o recorde`;
}

function Tile({
  icon,
  iconColor,
  background,
  border,
  children,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  iconColor: ColorToken;
  background: ColorToken;
  border: ColorToken;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[styles.tile, { backgroundColor: colors[background], borderColor: colors[border] }]}
      accessible
    >
      <Ionicons name={icon} size={18} color={colors[iconColor]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: spacing.sm },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md },
  header: { alignItems: "center", paddingTop: spacing.xxl, gap: spacing.md },
  illustration: { width: 160, height: 160 },
  headerText: { gap: spacing.xs, alignItems: "center" },
  center: { textAlign: "center" },
  tiles: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  tileWrap: { flex: 1 },
  tile: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  goalOpen: { backgroundColor: colors.surface, borderColor: colors.border },
  goalDone: { backgroundColor: colors.success100, borderColor: colors.success500 },
  semibold: { fontFamily: fontFamily.semibold },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.streak50,
    borderColor: colors.streak100,
  },
  flame: { width: 40, height: 40 },
  flex: { flex: 1, gap: spacing.xs },
  flipBox: { overflow: "hidden" },
  flipLayer: { position: "absolute", left: 0, right: 0 },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gold50,
    borderColor: colors.gold200,
  },
  medal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.gold600,
    backgroundColor: colors.gold100,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  primary: { minHeight: 52 },
  secondaryRow: { flexDirection: "row", gap: spacing.xs },
  secondary: { flex: 1 },
  goalCard: { flexDirection: "row", alignItems: "center" },
  goodbye: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
});
