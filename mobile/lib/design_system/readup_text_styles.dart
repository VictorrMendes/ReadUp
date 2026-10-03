import 'package:flutter/material.dart';

import 'readup_colors.dart';

const _inter = 'Inter';
const _literata = 'Literata';

/// Interface em Inter. As telas usam `Theme.of(context).textTheme` (regra do projeto):
/// headlineLarge = h1, headlineMedium = h2, titleLarge = h3, bodyLarge = corpo,
/// bodyMedium = small, bodySmall = caption, labelLarge = botão, labelSmall = overline.
const readupTextTheme = TextTheme(
  displaySmall: TextStyle(
    fontFamily: _inter,
    fontSize: 32,
    height: 40 / 32,
    fontWeight: FontWeight.w700,
  ),
  headlineLarge: TextStyle(
    fontFamily: _inter,
    fontSize: 28,
    height: 36 / 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
  ),
  headlineMedium: TextStyle(
    fontFamily: _inter,
    fontSize: 22,
    height: 30 / 22,
    fontWeight: FontWeight.w600,
  ),
  titleLarge: TextStyle(
    fontFamily: _inter,
    fontSize: 18,
    height: 26 / 18,
    fontWeight: FontWeight.w600,
  ),
  titleMedium: TextStyle(
    fontFamily: _inter,
    fontSize: 16,
    height: 24 / 16,
    fontWeight: FontWeight.w600,
  ),
  bodyLarge: TextStyle(fontFamily: _inter, fontSize: 16, height: 24 / 16),
  bodyMedium: TextStyle(fontFamily: _inter, fontSize: 14, height: 20 / 14),
  bodySmall: TextStyle(fontFamily: _inter, fontSize: 12, height: 16 / 12),
  labelLarge: TextStyle(
    fontFamily: _inter,
    fontSize: 16,
    height: 24 / 16,
    fontWeight: FontWeight.w600,
  ),
  labelSmall: TextStyle(
    fontFamily: _inter,
    fontSize: 12,
    height: 16 / 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.6,
  ),
);

/// Estilos do ReadUp que não têm lugar no TextTheme: leitura em serifa e números. Acesso por
/// `context.readupText` (core/extensions/context_extension.dart).
@immutable
class ReadUpTextStyles extends ThemeExtension<ReadUpTextStyles> {
  const ReadUpTextStyles({
    required this.reading,
    required this.readingTitle,
    required this.cardTitle,
    required this.hero,
    required this.stat,
  });

  static const standard = ReadUpTextStyles(
    // leitura longa: serifa, entrelinha ~1.6
    reading: TextStyle(
      fontFamily: _literata,
      fontSize: 18,
      height: 29 / 18,
      color: ReadUpColors.textPrimary,
    ),
    readingTitle: TextStyle(
      fontFamily: _literata,
      fontSize: 28,
      height: 36 / 28,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.3,
      color: ReadUpColors.textPrimary,
    ),
    cardTitle: TextStyle(
      fontFamily: _literata,
      fontSize: 18,
      height: 25 / 18,
      fontWeight: FontWeight.w600,
      color: ReadUpColors.textPrimary,
    ),
    // número da meta; dígitos de largura fixa não "dançam" ao contar
    hero: TextStyle(
      fontFamily: _inter,
      fontSize: 40,
      height: 48 / 40,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.5,
      fontFeatures: [FontFeature.tabularFigures()],
      color: ReadUpColors.textPrimary,
    ),
    stat: TextStyle(
      fontFamily: _inter,
      fontSize: 22,
      height: 28 / 22,
      fontWeight: FontWeight.w700,
      fontFeatures: [FontFeature.tabularFigures()],
      color: ReadUpColors.textPrimary,
    ),
  );

  final TextStyle reading;
  final TextStyle readingTitle;
  final TextStyle cardTitle;
  final TextStyle hero;
  final TextStyle stat;

  @override
  ReadUpTextStyles copyWith({
    TextStyle? reading,
    TextStyle? readingTitle,
    TextStyle? cardTitle,
    TextStyle? hero,
    TextStyle? stat,
  }) => ReadUpTextStyles(
    reading: reading ?? this.reading,
    readingTitle: readingTitle ?? this.readingTitle,
    cardTitle: cardTitle ?? this.cardTitle,
    hero: hero ?? this.hero,
    stat: stat ?? this.stat,
  );

  @override
  ReadUpTextStyles lerp(ReadUpTextStyles? other, double t) {
    if (other == null) return this;
    return ReadUpTextStyles(
      reading: TextStyle.lerp(reading, other.reading, t)!,
      readingTitle: TextStyle.lerp(readingTitle, other.readingTitle, t)!,
      cardTitle: TextStyle.lerp(cardTitle, other.cardTitle, t)!,
      hero: TextStyle.lerp(hero, other.hero, t)!,
      stat: TextStyle.lerp(stat, other.stat, t)!,
    );
  }
}
