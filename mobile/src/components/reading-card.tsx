import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { PressableScale } from "@/components/pressable-scale";
import { ProgressBar } from "@/components/progress-bar";
import type { ArticleSummary } from "@/lib/articles";
import { bookTitle } from "@/lib/books";
import { formatNumber } from "@/lib/format";
import { colors, radius, ripple, spacing } from "@/theme";

type Props = {
  article: Pick<
    ArticleSummary,
    "title" | "difficulty" | "category" | "word_count" | "estimated_minutes" | "progress" | "completed"
  > &
    Partial<Pick<ArticleSummary, "source" | "book_title">>;
  onPress?: () => void;
};

// notícias mostram a fonte (ex.: "VOA Learning English"), sem logo de terceiros
const NEWS_CATEGORY = "Notícias";

export function ReadingCard({ article, onPress }: Props) {
  const inProgress = article.progress > 0 && !article.completed;
  // capítulo: o nome do livro diz mais que "Livro"
  const kind = article.book_title ? bookTitle(article.book_title) : article.category;
  const source = article.category === NEWS_CATEGORY ? article.source : undefined;
  // leitor de tela: um rótulo só, em vez de ler badge por badge
  const label = [
    article.title,
    article.difficulty && `nível ${article.difficulty}`,
    kind,
    source,
    `${article.estimated_minutes} ${article.estimated_minutes === 1 ? "minuto" : "minutos"}`,
    article.completed ? "concluído" : inProgress && `${article.progress}% lido`,
  ]
    .filter(Boolean)
    .join(", ");

  const card = (
    <Card style={styles.card}>
      <View style={styles.badges}>
        {article.difficulty && <Badge label={article.difficulty} tone="primary" />}
        <Badge label={kind} />
      </View>
      {article.completed && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={colors.success600}
          style={styles.check}
        />
      )}
      <AppText variant="cardTitle" numberOfLines={2}>
        {article.title}
      </AppText>
      <View style={styles.meta}>
        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
        <AppText variant="small" color="textSecondary">
          {article.estimated_minutes} min · {formatNumber(article.word_count)} palavras
        </AppText>
      </View>
      {source && (
        <AppText variant="caption" color="textSecondary">
          {source}
        </AppText>
      )}
      {inProgress && (
        <View style={styles.progress}>
          <View style={styles.bar}>
            <ProgressBar value={article.progress / 100} />
          </View>
          <AppText variant="caption" color="textSecondary">
            {article.progress}% lido
          </AppText>
        </View>
      )}
    </Card>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        {card}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={ripple}
      scaleTo={0.98}
      style={styles.pressable}
    >
      {card}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  badges: { flexDirection: "row", gap: spacing.sm, paddingRight: spacing.xxl },
  check: { position: "absolute", top: spacing.lg, right: spacing.lg },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  progress: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bar: { flex: 1 },
  pressable: { borderRadius: radius.card, overflow: "hidden" }, // ripple respeita o raio
});
