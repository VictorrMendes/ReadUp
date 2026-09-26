import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { ProgressBar } from "@/components/progress-bar";
import type { ArticleSummary } from "@/lib/articles";
import { spacing } from "@/theme";

type Props = {
  article: Pick<
    ArticleSummary,
    "title" | "difficulty" | "category" | "word_count" | "estimated_minutes" | "progress" | "completed"
  >;
  onPress?: () => void;
};

export function ReadingCard({ article, onPress }: Props) {
  const card = (
    <Card style={styles.card}>
      <AppText variant="h3">{article.title}</AppText>
      <View style={styles.badges}>
        {article.difficulty && <Badge label={article.difficulty} tone="primary" />}
        <Badge label={article.category} />
        {article.completed && <Badge label="Concluído" tone="success" />}
      </View>
      <AppText variant="small" color="textSecondary">
        {article.estimated_minutes} min · {article.word_count} palavras
      </AppText>
      {article.progress > 0 && <ProgressBar value={article.progress / 100} />}
    </Card>
  );

  if (!onPress) return card;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}
    >
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  badges: { flexDirection: "row", gap: spacing.sm },
  pressed: { opacity: 0.85 },
});
