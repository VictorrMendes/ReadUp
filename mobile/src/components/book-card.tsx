import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { PressableScale } from "@/components/pressable-scale";
import { ProgressBar } from "@/components/progress-bar";
import { bookTitle, type Book } from "@/lib/books";
import { formatNumber } from "@/lib/format";
import { radius, ripple, spacing } from "@/theme";

type Props = {
  book: Pick<Book, "title" | "word_count" | "words_read" | "progress" | "chapter_count" | "page_count">;
  onPress: () => void;
};

const plural = (count: number, one: string, many: string) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;

// PDF importado: título, quanto já foi lido e o tamanho. O card inteiro abre o livro.
export function BookCard({ book, onPress }: Props) {
  const read = `${formatNumber(book.words_read)} de ${formatNumber(book.word_count)} palavras`;
  const size = `${plural(book.chapter_count, "capítulo", "capítulos")} · ${plural(book.page_count, "página", "páginas")}`;
  // leitor de tela: um rótulo só, em vez de ler item por item
  const label = [bookTitle(book.title), read, book.progress > 0 && `${book.progress}% lido`, size]
    .filter(Boolean)
    .join(", ");

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={ripple}
      scaleTo={0.98}
      style={styles.pressable}
    >
      <Card style={styles.card}>
        <AppText variant="cardTitle" numberOfLines={2}>
          {bookTitle(book.title)}
        </AppText>
        <AppText variant="small" color="textSecondary">
          {read}
        </AppText>
        {book.progress > 0 && (
          <View style={styles.progress}>
            <View style={styles.bar}>
              <ProgressBar value={book.progress / 100} />
            </View>
            <AppText variant="caption" color="textSecondary">
              {book.progress}% lido
            </AppText>
          </View>
        )}
        <AppText variant="caption" color="textSecondary">
          {size}
        </AppText>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  progress: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bar: { flex: 1 },
  pressable: { borderRadius: radius.card, overflow: "hidden" }, // ripple respeita o raio
});
