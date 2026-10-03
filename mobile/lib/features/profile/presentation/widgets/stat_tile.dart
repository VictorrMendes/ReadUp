import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';

/// Um número em destaque com o que ele mede ("3.450 palavras lidas").
class StatTile extends StatelessWidget {
  const StatTile({
    super.key,
    required this.value,
    required this.label,
    this.icon,
    this.semanticLabel,
  });

  /// já formatado (número pt-BR ou "2 / 1")
  final String value;

  /// em minúsculas: também forma o rótulo acessível
  final String label;
  final Widget? icon;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: semanticLabel ?? '$value $label',
      excludeSemantics: true,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(Spaces.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (icon case final leading?) ...[leading, const SizedBox(width: Spaces.sm)],
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(value, style: context.textTheme.headlineMedium),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: Spaces.xs),
              Text(
                label,
                style: context.textTheme.bodyMedium?.copyWith(color: ReadUpColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
