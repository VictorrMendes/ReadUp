import 'package:flutter/material.dart';

import 'readup_colors.dart';
import 'readup_text_styles.dart';
import 'spaces.dart';

final mainTheme = _buildTheme();

ThemeData _buildTheme() {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: ReadUpColors.primary500,
    primary: ReadUpColors.primary500,
    onPrimary: Colors.white,
    primaryContainer: ReadUpColors.primary100,
    onPrimaryContainer: ReadUpColors.primary700,
    surface: ReadUpColors.surface,
    onSurface: ReadUpColors.textPrimary,
    onSurfaceVariant: ReadUpColors.textSecondary,
    outline: ReadUpColors.borderStrong,
    outlineVariant: ReadUpColors.border,
    error: ReadUpColors.errorText,
  );
  final text = readupTextTheme.apply(
    bodyColor: ReadUpColors.textPrimary,
    displayColor: ReadUpColors.textPrimary,
  );
  final buttonShape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.md));
  const buttonSize = Size(64, Spaces.touchTarget);

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    textTheme: text,
    fontFamily: 'Inter',
    scaffoldBackgroundColor: ReadUpColors.background,
    extensions: const [ReadUpTextStyles.standard],
    appBarTheme: AppBarTheme(
      backgroundColor: ReadUpColors.surface,
      foregroundColor: ReadUpColors.textPrimary,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      shape: const Border(bottom: BorderSide(color: ReadUpColors.border)),
      titleTextStyle: text.titleLarge,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: buttonSize,
        shape: buttonShape,
        textStyle: text.labelLarge,
        padding: const EdgeInsets.symmetric(horizontal: Spaces.xl, vertical: Spaces.md),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: buttonSize,
        shape: buttonShape,
        textStyle: text.labelLarge,
        foregroundColor: ReadUpColors.textPrimary,
        side: const BorderSide(color: ReadUpColors.border),
        backgroundColor: ReadUpColors.surface,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: buttonSize,
        shape: buttonShape,
        textStyle: text.labelLarge,
      ),
    ),
    cardTheme: CardThemeData(
      color: ReadUpColors.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Radii.card),
        side: const BorderSide(color: ReadUpColors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: ReadUpColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Radii.md),
        borderSide: const BorderSide(color: ReadUpColors.borderStrong),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Radii.md),
        borderSide: const BorderSide(color: ReadUpColors.borderStrong),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Radii.md),
        borderSide: const BorderSide(color: ReadUpColors.primary500, width: 2),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: ReadUpColors.surface,
      surfaceTintColor: Colors.transparent,
      indicatorColor: ReadUpColors.primary100,
      labelTextStyle: WidgetStatePropertyAll(text.labelSmall?.copyWith(letterSpacing: 0)),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: ReadUpColors.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.sheet)),
      ),
    ),
    dividerTheme: const DividerThemeData(color: ReadUpColors.border, thickness: 1),
  );
}
