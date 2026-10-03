import 'dart:convert';

import 'package:equatable/equatable.dart';
import 'package:flutter/painting.dart';

enum ReaderFont { serif, sans }

/// Tema só da tela de leitura (o resto do app segue o tema normal). Contraste texto/secundário
/// sobre o fundo: claro 16.5/5.4, sépia 11.1/5.6, escuro 14.3/7.1.
enum ReaderTheme {
  light(
    label: 'Claro',
    isDark: false,
    background: Color(0xFFFAF8F4),
    text: Color(0xFF1C1917),
    secondary: Color(0xFF6B6560),
    mark: Color(0xFFE8E8F6),
    link: Color(0xFF2F2E80),
    border: Color(0xFFE7E2DA),
  ),
  sepia(
    label: 'Sépia',
    isDark: false,
    background: Color(0xFFF4ECD8),
    text: Color(0xFF3B2F20),
    secondary: Color(0xFF6B5A44),
    mark: Color(0xFFE3D3AE),
    link: Color(0xFF5B4A33),
    border: Color(0xFFE2D5B7),
  ),
  dark(
    label: 'Escuro',
    isDark: true,
    background: Color(0xFF17161C),
    text: Color(0xFFE7E5E2),
    secondary: Color(0xFFA8A29E),
    mark: Color(0xFF3A3970),
    link: Color(0xFFB9B8F0),
    border: Color(0xFF2E2C35),
  );

  const ReaderTheme({
    required this.label,
    required this.isDark,
    required this.background,
    required this.text,
    required this.secondary,
    required this.mark,
    required this.link,
    required this.border,
  });

  final String label;
  final bool isDark;
  final Color background;
  final Color text;
  final Color secondary;

  /// fundo da palavra/frase tocada
  final Color mark;
  final Color link;
  final Color border;
}

const readerFontSizes = [16.0, 18.0, 20.0, 22.0, 24.0];

class ReaderSettings extends Equatable {
  const ReaderSettings({
    this.sizeIndex = 1,
    this.font = ReaderFont.serif,
    this.theme = ReaderTheme.light,
  });

  /// 18, o tamanho de leitura do Design System
  final int sizeIndex;
  final ReaderFont font;
  final ReaderTheme theme;

  double get fontSize => readerFontSizes[sizeIndex.clamp(0, readerFontSizes.length - 1)];

  /// Texto corrido: tamanho escolhido com entrelinha ~1.6.
  TextStyle get body => TextStyle(
    fontFamily: font == ReaderFont.serif ? 'Literata' : 'Inter',
    fontSize: fontSize,
    height: 1.6,
    color: theme.text,
  );

  /// Título: acompanha o tamanho escolhido (28 no padrão).
  TextStyle get title => TextStyle(
    fontFamily: font == ReaderFont.serif ? 'Literata' : 'Inter',
    fontWeight: font == ReaderFont.serif ? FontWeight.w600 : FontWeight.w700,
    fontSize: 28 + fontSize - 18,
    height: 1.28,
    color: theme.text,
  );

  ReaderSettings copyWith({int? sizeIndex, ReaderFont? font, ReaderTheme? theme}) => ReaderSettings(
    sizeIndex: (sizeIndex ?? this.sizeIndex).clamp(0, readerFontSizes.length - 1),
    font: font ?? this.font,
    theme: theme ?? this.theme,
  );

  String toJson() => jsonEncode({'sizeIndex': sizeIndex, 'font': font.name, 'theme': theme.name});

  /// Lê o que veio do aparelho; qualquer coisa inválida volta ao padrão.
  static ReaderSettings fromJson(String? raw) {
    if (raw == null) return const ReaderSettings();
    try {
      final data = jsonDecode(raw);
      if (data is! Map<String, Object?>) return const ReaderSettings();
      return ReaderSettings(
        sizeIndex: switch (data['sizeIndex']) {
          final int i => i.clamp(0, readerFontSizes.length - 1),
          _ => 1,
        },
        font: ReaderFont.values.asNameMap()[data['font']] ?? ReaderFont.serif,
        theme: ReaderTheme.values.asNameMap()[data['theme']] ?? ReaderTheme.light,
      );
    } on FormatException {
      return const ReaderSettings();
    }
  }

  @override
  List<Object?> get props => [sizeIndex, font, theme];
}
