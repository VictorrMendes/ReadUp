import type { Ref } from "react";
import { Text, type TextProps } from "react-native";

import { colors, typography, type ColorToken, type TypographyVariant } from "@/theme";

// ref: React 19 passa como prop comum (ex.: foco de acessibilidade no título)
type Props = TextProps & { variant?: TypographyVariant; color?: ColorToken; ref?: Ref<Text> };

export function AppText({ variant = "body", color = "textPrimary", style, ...props }: Props) {
  return <Text style={[typography[variant], { color: colors[color] }, style]} {...props} />;
}
