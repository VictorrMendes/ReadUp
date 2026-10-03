import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';

/// Chama da ofensiva: acesa quando a ofensiva contou hoje (pulsa duas vezes ao aparecer, com
/// antecipação); com a meta batida, ganha o halo dourado. Decorativa (o cartão descreve).
class StreakFlame extends StatefulWidget {
  const StreakFlame({super.key, required this.active, required this.golden});

  final bool active;
  final bool golden;

  @override
  State<StreakFlame> createState() => _StreakFlameState();
}

class _StreakFlameState extends State<StreakFlame> with SingleTickerProviderStateMixin {
  // dois pulsos de 600 ms: encolhe um pouco (antecipação), cresce e assenta
  late final _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );
  late final _scale = TweenSequence([
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.92), weight: 1),
    TweenSequenceItem(tween: Tween(begin: 0.92, end: 1.15), weight: 2),
    TweenSequenceItem(tween: Tween(begin: 1.15, end: 1.0), weight: 2),
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.92), weight: 1),
    TweenSequenceItem(tween: Tween(begin: 0.92, end: 1.15), weight: 2),
    TweenSequenceItem(tween: Tween(begin: 1.15, end: 1.0), weight: 2),
  ]).animate(CurvedAnimation(parent: _pulse, curve: Curves.easeInOut));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (widget.active && !context.reduceMotion && _pulse.status == AnimationStatus.dismissed) {
      Future<void>.delayed(const Duration(milliseconds: 300), () {
        if (mounted) _pulse.forward();
      });
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Container(
        key: widget.golden ? const ValueKey('gold-flame') : null,
        width: 52,
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: widget.golden ? ReadUpColors.gold100 : null,
          border: Border.all(
            color: widget.golden ? ReadUpColors.gold600 : Colors.transparent,
            width: 2,
          ),
        ),
        child: ScaleTransition(
          scale: _scale,
          child: Image.asset(
            widget.active ? 'assets/images/streak.png' : 'assets/images/streak-inactive.png',
            width: 38,
            height: 38,
          ),
        ),
      ),
    );
  }
}
