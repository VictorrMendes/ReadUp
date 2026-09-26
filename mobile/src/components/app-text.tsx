import { Text, type TextProps } from "react-native";

import { colors, typography, type ColorToken, type TypographyVariant } from "@/theme";

type Props = TextProps & { variant?: TypographyVariant; color?: ColorToken };

export function AppText({ variant = "body", color = "textPrimary", style, ...props }: Props) {
  return <Text style={[typography[variant], { color: colors[color] }, style]} {...props} />;
}
