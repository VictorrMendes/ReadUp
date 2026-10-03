import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/readup_colors.dart';
import '../../../design_system/spaces.dart';

class OptionItem<T> {
  const OptionItem({required this.value, required this.label, required this.description});

  final T value;
  final String label;
  final String description;
}

/// Escolha única (nível, meta) como grupo de rádio. Selecionado: borda e fundo índigo + check,
/// para a seleção não depender só da cor.
class OptionList<T> extends StatelessWidget {
  const OptionList({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final List<OptionItem<T>> options;
  final T? value;
  final ValueChanged<T> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final option in options)
          Padding(
            padding: const EdgeInsets.only(bottom: Spaces.sm),
            child: _OptionTile(
              option: option,
              selected: option.value == value,
              onTap: enabled
                  ? () {
                      if (option.value != value) Haptics.select();
                      onChanged(option.value);
                    }
                  : null,
            ),
          ),
      ],
    );
  }
}

class _OptionTile<T> extends StatelessWidget {
  const _OptionTile({required this.option, required this.selected, required this.onTap});

  final OptionItem<T> option;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    return Semantics(
      container: true,
      inMutuallyExclusiveGroup: true,
      checked: selected,
      label: '${option.label}, ${option.description}',
      excludeSemantics: true,
      child: Material(
        color: selected ? ReadUpColors.primary100 : ReadUpColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
          side: BorderSide(color: selected ? ReadUpColors.primary500 : ReadUpColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: Spaces.lg, vertical: Spaces.md),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(option.label, style: text.titleMedium),
                      const SizedBox(height: Spaces.xs),
                      Text(
                        option.description,
                        // sobre primary100 o cinza cai para 3.9:1; primary700 mantém AA
                        style: text.bodyMedium?.copyWith(
                          color: selected ? ReadUpColors.primary700 : ReadUpColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                AnimatedOpacity(
                  opacity: selected ? 1 : 0,
                  duration: const Duration(milliseconds: 160),
                  child: const Icon(Icons.check_circle, color: ReadUpColors.primary500),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
