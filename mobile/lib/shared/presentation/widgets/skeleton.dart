import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/readup_colors.dart';
import '../../../design_system/spaces.dart';

/// Bloco que guarda o espaço do conteúdo enquanto carrega. Pulsa devagar; parado com "reduzir
/// movimento". Decorativo: quem usa anuncia "Carregando".
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, required this.height, this.width = double.infinity});

  final double height;
  final double width;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 700))
    ..repeat(reverse: true);

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final block = ExcludeSemantics(
      child: Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          color: ReadUpColors.border,
          borderRadius: BorderRadius.circular(Radii.card),
        ),
      ),
    );
    if (context.reduceMotion) return block;
    return FadeTransition(opacity: Tween(begin: 1.0, end: 0.5).animate(_pulse), child: block);
  }
}
