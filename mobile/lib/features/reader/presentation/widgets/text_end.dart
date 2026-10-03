import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/presentation/widgets/loading_button.dart';
import '../../domain/end_state.dart';
import '../../domain/models/reader_settings.dart';

typedef NavAction = ({String label, VoidCallback onPressed});

/// Fim do texto: "Concluir leitura" (a pessoa marca; o servidor valida), a resposta gentil quando
/// foi rápido demais, ou "Você já concluiu este texto" com as ações. Separado do último parágrafo
/// por uma divisória, sem cara de gamificação (leitura neutra).
class TextEnd extends StatelessWidget {
  const TextEnd({
    super.key,
    required this.state,
    required this.finishing,
    required this.onFinish,
    required this.primary,
    required this.secondary,
    required this.theme,
  });

  final EndState state;
  final bool finishing;
  final VoidCallback onFinish;
  final NavAction? primary;
  final NavAction secondary;
  final ReaderTheme theme;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final secondaryText = text.bodyMedium?.copyWith(color: theme.secondary);
    return Container(
      margin: const EdgeInsets.only(top: Spaces.xl),
      padding: const EdgeInsets.only(top: Spaces.xl),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: theme.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: switch (state) {
          EndDone() => [
            Row(
              children: [
                const Icon(Icons.check_circle, color: ReadUpColors.success600, size: 20),
                const SizedBox(width: Spaces.xs),
                Expanded(
                  child: Text(
                    'Você já concluiu este texto',
                    style: text.titleMedium?.copyWith(color: theme.text),
                  ),
                ),
              ],
            ),
            if (primary case final action?) ...[
              const SizedBox(height: Spaces.md),
              FilledButton(onPressed: action.onPressed, child: Text(action.label)),
            ],
            const SizedBox(height: Spaces.sm),
            OutlinedButton(onPressed: secondary.onPressed, child: Text(secondary.label)),
          ],
          _ => [
            Semantics(
              header: true,
              child: Text(
                'Você chegou ao fim',
                style: text.titleLarge?.copyWith(color: theme.text),
              ),
            ),
            const SizedBox(height: Spaces.md),
            LoadingButton(label: 'Concluir leitura', loading: finishing, onPressed: onFinish),
            if (state case EndTooFast(:final seconds)) ...[
              const SizedBox(height: Spaces.sm),
              Semantics(
                liveRegion: true,
                child: Text(
                  'Você passou rápido por este texto. Para contar como lido, leia com calma: faltam '
                  'cerca de ${seconds.formatted} ${seconds == 1 ? 'segundo' : 'segundos'} de leitura.',
                  style: secondaryText,
                ),
              ),
            ],
            if (state is EndError) ...[
              const SizedBox(height: Spaces.sm),
              Semantics(
                liveRegion: true,
                child: Text(
                  'Não foi possível confirmar agora. Tente de novo.',
                  style: secondaryText,
                ),
              ),
            ],
          ],
        },
      ),
    );
  }
}
