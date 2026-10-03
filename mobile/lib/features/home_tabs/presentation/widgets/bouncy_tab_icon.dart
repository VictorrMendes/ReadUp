import 'package:flutter/material.dart';

import '../../../../core/core.dart';

/// Ícone da aba que dá um salto curto quando ela passa a ser a ativa (não ao abrir o app).
class BouncyTabIcon extends StatefulWidget {
  const BouncyTabIcon({super.key, required this.icon, required this.selected});

  final IconData icon;
  final bool selected;

  @override
  State<BouncyTabIcon> createState() => _BouncyTabIconState();
}

class _BouncyTabIconState extends State<BouncyTabIcon> with SingleTickerProviderStateMixin {
  late final _bounce = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 320),
  );
  late final _scale = TweenSequence([
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.18), weight: 1),
    TweenSequenceItem(
      tween: Tween(begin: 1.18, end: 1.0).chain(CurveTween(curve: Curves.easeOutBack)),
      weight: 2,
    ),
  ]).animate(_bounce);

  @override
  void didUpdateWidget(BouncyTabIcon old) {
    super.didUpdateWidget(old);
    if (widget.selected && !old.selected && !context.reduceMotion) _bounce.forward(from: 0);
  }

  @override
  void dispose() {
    _bounce.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ScaleTransition(scale: _scale, child: Icon(widget.icon));
}
