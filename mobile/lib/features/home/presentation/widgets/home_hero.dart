import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/presentation/widgets/xp_badge.dart';

/// Topo do Início sobre a arte índigo: data, XP, "Olá" e a frase da meta.
class HomeHero extends StatelessWidget {
  const HomeHero({
    super.key,
    required this.name,
    required this.minHeight,
    this.xp,
    this.message,
    this.today,
  });

  final String name;
  final double minHeight;
  final int? xp;
  final String? message;

  /// injetável para testes
  final DateTime? today;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: minHeight),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Spaces.xl, Spaces.lg, Spaces.xl, Spaces.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      (today ?? DateTime.now()).longDate,
                      style: text.bodyMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (xp case final total?) XpBadge(xp: total, onHero: true),
                ],
              ),
              const SizedBox(height: Spaces.sm),
              Semantics(
                header: true,
                child: Text('Olá, $name', style: text.headlineLarge?.copyWith(color: Colors.white)),
              ),
              if (message case final line?) ...[
                const SizedBox(height: Spaces.xs),
                FractionallySizedBox(
                  // a arte ocupa a direita
                  widthFactor: 0.64,
                  child: Text(line, style: text.bodyLarge?.copyWith(color: Colors.white)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
