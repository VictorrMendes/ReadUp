import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/constants/levels.dart';

/// Chips de nível (Todos, A1…C1), rolagem horizontal.
class LevelFilter extends StatelessWidget {
  const LevelFilter({super.key, required this.selected, required this.onSelected});

  final EnglishLevel? selected;
  final ValueChanged<EnglishLevel?> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: Spaces.lg, vertical: Spaces.sm),
        children: [
          for (final level in <EnglishLevel?>[null, ...EnglishLevel.values])
            Padding(
              padding: const EdgeInsets.only(right: Spaces.sm),
              child: ChoiceChip(
                label: Text(level?.code ?? 'Todos'),
                selected: level == selected,
                showCheckmark: false,
                onSelected: (_) {
                  if (level != selected) {
                    Haptics.select();
                    onSelected(level);
                  }
                },
              ),
            ),
        ],
      ),
    );
  }
}
