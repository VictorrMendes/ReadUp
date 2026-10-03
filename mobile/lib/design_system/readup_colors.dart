import 'package:flutter/painting.dart';

/// Paleta "Índigo tinta" (mesmos valores do web). Papéis: índigo = marca e ação; verde = meta
/// cumprida; laranja = só ofensiva; dourado = recompensa. Contrastes medidos contra o fundo indicado.
abstract final class ReadUpColors {
  static const primary50 = Color(0xFFF2F2FA); // superfície tingida índigo
  static const primary100 = Color(0xFFE8E8F6);
  static const primary200 = Color(0xFFCFCFEC);
  static const primary500 = Color(0xFF3B3A98); // ação e marca (9.36:1 com texto branco)
  static const primary600 = Color(0xFF2F2E80); // pressionado
  static const primary700 = Color(0xFF2C2B78); // texto sobre primary50 (10.94:1)

  static const success100 = Color(0xFFDCFCE7);
  static const success500 = Color(0xFF22C55E); // barra e superfícies
  static const success600 = Color(0xFF16A34A); // ícone de concluído (3.30:1 sobre surface)
  static const success700 = Color(0xFF15803D); // texto sobre success100 (4.57:1)

  static const streak = Color(0xFFF97316);
  static const streak50 = Color(0xFFFFF7ED); // fundo do cartão de ofensiva
  static const streak100 = Color(0xFFFFEDD5); // borda do cartão de ofensiva
  static const streak700 = Color(0xFFC2410C); // texto sobre streak50 (4.88:1); check branco 5.2:1

  static const gold50 = Color(0xFFFFFBEB); // fundo de recompensa (XP e conquistas)
  static const gold100 = Color(0xFFFEF3C7);
  static const gold200 = Color(0xFFFDE68A);
  static const gold600 = Color(0xFFD97706); // só não-texto (3.19:1 sobre surface)
  static const gold700 = Color(0xFFB45309); // texto sobre gold50 (4.84:1)

  static const background = Color(0xFFFAF8F4); // "papel" quente
  static const surface = Color(0xFFFFFFFF);
  static const surfaceMuted = Color(0xFFF3F0EA); // medalha bloqueada, dia sem leitura
  static const textPrimary = Color(0xFF1C1917); // 16.49:1 sobre background
  static const textSecondary = Color(0xFF6B6560); // 5.42:1 sobre background
  static const border = Color(0xFFE7E2DA); // cards e divisórias
  static const borderStrong = Color(0xFF6B6560); // borda de campo (5.74:1 sobre surface)
  static const error = Color(0xFFEF4444); // só borda e ícone
  static const errorText = Color(0xFFDC2626); // texto de erro (4.55:1 sobre background)
  static const overlay = Color(0x801C1917); // textPrimary a 50%: fundo atrás do painel
}
