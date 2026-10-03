import 'package:flutter/material.dart';

import '../../../core/core.dart';
import '../../../design_system/motion.dart';

/// Superfície tocável que afunda de leve ao pressionar (~90 ms) e volta com mola. Com "reduzir
/// movimento", sem escala: fica o ripple do InkWell.
class PressableScale extends StatefulWidget {
  const PressableScale({
    super.key,
    required this.child,
    required this.onTap,
    this.borderRadius,
    this.scaleTo = 0.97,
    this.semanticLabel,
  });

  final Widget child;
  final VoidCallback? onTap;
  final BorderRadius? borderRadius;

  /// cards grandes encolhem menos
  final double scaleTo;

  /// rótulo único para o leitor de tela (em vez de ler cada texto do card)
  final String? semanticLabel;

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale> {
  var _pressed = false;

  void _set(bool pressed) {
    if (_pressed != pressed) setState(() => _pressed = pressed);
  }

  @override
  Widget build(BuildContext context) {
    final animate = !context.reduceMotion;
    return Semantics(
      container: widget.semanticLabel != null,
      button: widget.onTap != null,
      label: widget.semanticLabel,
      excludeSemantics: widget.semanticLabel != null,
      child: AnimatedScale(
        scale: _pressed && animate ? widget.scaleTo : 1,
        duration: _pressed ? Motion.press : const Duration(milliseconds: 220),
        curve: _pressed ? MotionCurves.standard : Curves.easeOutBack,
        child: Material(
          type: MaterialType.transparency,
          borderRadius: widget.borderRadius,
          clipBehavior: widget.borderRadius == null ? Clip.none : Clip.antiAlias,
          child: InkWell(
            onTap: widget.onTap,
            onHighlightChanged: _set,
            borderRadius: widget.borderRadius,
            child: widget.child,
          ),
        ),
      ),
    );
  }
}
