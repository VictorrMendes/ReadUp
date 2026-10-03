import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../design_system/spaces.dart';
import '../../domain/models/reader_settings.dart';
import '../cubits/reader_settings_cubit.dart';

/// Painel "Aa": tamanho do texto, fonte e tema do leitor (salvo no aparelho).
class ReaderSettingsSheet extends StatelessWidget {
  const ReaderSettingsSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final cubit = context.read<ReaderSettingsCubit>();
    final settings = context.watch<ReaderSettingsCubit>().state;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Spaces.xl, 0, Spaces.xl, Spaces.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(header: true, child: Text('Aparência do texto', style: text.titleLarge)),
            const SizedBox(height: Spaces.lg),
            Text('Tamanho', style: text.titleMedium),
            Row(
              children: [
                IconButton(
                  tooltip: 'Diminuir o texto',
                  icon: const Icon(Icons.text_decrease),
                  onPressed: settings.sizeIndex == 0
                      ? null
                      : () => cubit.update(settings.copyWith(sizeIndex: settings.sizeIndex - 1)),
                ),
                Expanded(
                  child: Slider(
                    value: settings.sizeIndex.toDouble(),
                    max: (readerFontSizes.length - 1).toDouble(),
                    divisions: readerFontSizes.length - 1,
                    label: '${settings.fontSize.round()}',
                    semanticFormatterCallback: (_) => 'Tamanho ${settings.fontSize.round()}',
                    onChanged: (value) => cubit.update(settings.copyWith(sizeIndex: value.round())),
                  ),
                ),
                IconButton(
                  tooltip: 'Aumentar o texto',
                  icon: const Icon(Icons.text_increase),
                  onPressed: settings.sizeIndex == readerFontSizes.length - 1
                      ? null
                      : () => cubit.update(settings.copyWith(sizeIndex: settings.sizeIndex + 1)),
                ),
              ],
            ),
            const SizedBox(height: Spaces.md),
            Text('Fonte', style: text.titleMedium),
            const SizedBox(height: Spaces.sm),
            SegmentedButton<ReaderFont>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment(value: ReaderFont.serif, label: Text('Serifa')),
                ButtonSegment(value: ReaderFont.sans, label: Text('Sem serifa')),
              ],
              selected: {settings.font},
              onSelectionChanged: (s) {
                Haptics.select();
                cubit.update(settings.copyWith(font: s.first));
              },
            ),
            const SizedBox(height: Spaces.lg),
            Text('Tema', style: text.titleMedium),
            const SizedBox(height: Spaces.sm),
            SegmentedButton<ReaderTheme>(
              showSelectedIcon: false,
              segments: [
                for (final theme in ReaderTheme.values)
                  ButtonSegment(value: theme, label: Text(theme.label)),
              ],
              selected: {settings.theme},
              onSelectionChanged: (s) {
                Haptics.select();
                cubit.update(settings.copyWith(theme: s.first));
              },
            ),
          ],
        ),
      ),
    );
  }
}
