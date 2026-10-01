import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { ProgressBar } from "@/components/progress-bar";
import { formatNumber } from "@/lib/format";
import { colors, fontFamily, shadow, spacing } from "@/theme";

const WORDS_PER_MINUTE = 200; // ritmo de leitura da nota design-v3

export type GoalAction = { label: string; variant: "primary" | "secondary" };

/**
 * Botão de 1 toque do cartão da meta: cumprida → "Ler mais um" (secondary); com texto em
 * andamento → "Continuar leitura"; senão → "Ler um texto" (um texto do nível da pessoa).
 */
export function goalAction(completed: boolean, hasInProgress: boolean): GoalAction {
  if (completed) return { label: "Ler mais um", variant: "secondary" };
  return { label: hasInProgress ? "Continuar leitura" : "Ler um texto", variant: "primary" };
}

type Props = {
  target: number;
  wordsToday: number;
  remaining: number;
  completed: boolean;
  action?: GoalAction & { onPress: () => void };
};

// Cartão herói do Início (a única sombra da tela): o número da meta em hero, a barra e a próxima
// ação a um toque.
export function DailyGoal({ target, wordsToday, remaining, completed, action }: Props) {
  const percent = Math.min(100, Math.floor((wordsToday / target) * 100));
  const minutes = Math.ceil(remaining / WORDS_PER_MINUTE);
  const extras = Math.max(0, wordsToday - target);
  // textSecondary sobre success100 dá 4.33:1 (abaixo de AA); concluída usa texto escuro
  const secondary = completed ? "textPrimary" : "textSecondary";

  return (
    <Card style={[styles.card, shadow.card, completed && styles.done]}>
      <View
        style={styles.info}
        accessible
        accessibilityLabel={
          `Meta de hoje: ${formatNumber(wordsToday)} de ${formatNumber(target)} palavras, ${percent}%. ` +
          (completed
            ? `Meta cumprida${extras ? `, ${formatNumber(extras)} palavras extras` : ""}`
            : `Faltam ${formatNumber(remaining)} palavras, cerca de ${minutes} min de leitura`)
        }
      >
        <View style={styles.row}>
          <AppText variant="overline" color={secondary}>
            Meta de hoje
          </AppText>
          <AppText
            variant="small"
            color={completed ? "success700" : "primary600"}
            style={styles.semibold}
          >
            {percent}%
          </AppText>
        </View>
        <View style={styles.numbers}>
          <AppText variant="hero">{formatNumber(wordsToday)}</AppText>
          <AppText color={secondary}>/ {formatNumber(target)} palavras</AppText>
        </View>
        <ProgressBar
          value={wordsToday / target}
          tone={completed ? "success" : "primary"}
          size="large"
        />
        <View style={styles.status}>
          {completed ? (
            <>
              <Ionicons name="checkmark-circle" size={16} color={colors.success600} />
              <AppText variant="small" style={styles.semibold}>
                {extras ? `Meta cumprida · +${formatNumber(extras)} extras` : "Meta cumprida"}
              </AppText>
            </>
          ) : (
            <>
              <Ionicons name="time-outline" size={16} color={colors.textPrimary} />
              <AppText variant="small">≈ {minutes} min de leitura para fechar</AppText>
            </>
          )}
        </View>
      </View>
      {action && (
        <Button
          title={action.label}
          variant={action.variant}
          icon="book"
          onPress={action.onPress}
          style={styles.action}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  info: { gap: spacing.sm },
  done: { backgroundColor: colors.success100, borderColor: colors.success500 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  numbers: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  status: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  semibold: { fontFamily: fontFamily.semibold },
  action: { minHeight: 52 },
});
