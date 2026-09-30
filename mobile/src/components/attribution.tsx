import { Linking, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { spacing, touchTarget } from "@/theme";

type Props = { text: string; url: string | null };

// Crédito da fonte no fim do texto (notícias): discreto, com o link para o original.
export function Attribution({ text, url }: Props) {
  // só abre link web; o valor vem do backend (fontes da allowlist), mas não custa conferir
  const link = url?.startsWith("https://") ? url : null;
  return (
    <View style={styles.container}>
      <AppText variant="caption" color="textSecondary">
        {text}
      </AppText>
      {link && (
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Abre o texto original no navegador"
          onPress={() => void Linking.openURL(link)}
          style={styles.link}
        >
          <AppText variant="caption" color="primary600" style={styles.underline}>
            Ler original
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm, marginBottom: spacing.xs },
  link: { alignSelf: "flex-start", minHeight: touchTarget, justifyContent: "center" },
  underline: { textDecorationLine: "underline" },
});
