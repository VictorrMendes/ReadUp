import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/readup_colors.dart';
import '../../../design_system/spaces.dart';
import 'loading_button.dart';

/// Lista vazia: ilustração, título, explicação e uma ação opcional.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.illustration,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
    this.loading = false,
  });

  final String illustration;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    return Padding(
      padding: const EdgeInsets.all(Spaces.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(illustration, height: 140, excludeFromSemantics: true),
          const SizedBox(height: Spaces.lg),
          Text(title, textAlign: TextAlign.center, style: text.titleLarge),
          const SizedBox(height: Spaces.sm),
          Text(
            message,
            textAlign: TextAlign.center,
            style: text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary),
          ),
          if (actionLabel case final label?) ...[
            const SizedBox(height: Spaces.xl),
            LoadingButton(label: label, loading: loading, onPressed: onAction),
          ],
        ],
      ),
    );
  }
}
