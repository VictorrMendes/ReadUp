import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { IconButton } from "@/components/icon-button";
import { speak } from "@/lib/speech";
import { splitAround } from "@/lib/vocabulary";
import { colors, fontFamily, spacing } from "@/theme";

type Props = { sentence: string; word: string };

/** Frase de origem como citação, com a palavra destacada e o botão de ouvir a frase. */
export function ContextSentence({ sentence, word }: Props) {
  const parts = splitAround(sentence, word);
  return (
    <View style={styles.quote}>
      <AppText variant="small" style={styles.sentence} accessibilityLabel={sentence}>
        {parts ? (
          <>
            {parts.before}
            <AppText variant="small" style={styles.mark}>
              {parts.match}
            </AppText>
            {parts.after}
          </>
        ) : (
          sentence
        )}
      </AppText>
      <IconButton
        icon="play-circle-outline"
        color="textSecondary"
        accessibilityLabel="Ouvir a frase"
        onPress={() => speak(sentence)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  quote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary200,
  },
  sentence: { flex: 1, fontFamily: fontFamily.serif, lineHeight: 22, paddingTop: spacing.sm },
  mark: { fontFamily: fontFamily.serifSemibold, backgroundColor: colors.primary100 },
});
