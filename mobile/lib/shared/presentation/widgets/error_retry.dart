import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/readup_colors.dart';
import '../../../design_system/spaces.dart';

/// Falha ao carregar: a mensagem e "Tentar novamente".
class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Spaces.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: context.textTheme.bodyLarge?.copyWith(color: ReadUpColors.errorText),
            ),
            const SizedBox(height: Spaces.lg),
            FilledButton(onPressed: onRetry, child: const Text('Tentar novamente')),
          ],
        ),
      ),
    );
  }
}
