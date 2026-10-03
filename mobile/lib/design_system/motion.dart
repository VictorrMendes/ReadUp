import 'package:flutter/animation.dart';

/// Linguagem de movimento (plan.txt §3, tokens do Material 3). Tudo em transform/opacity; com
/// "reduzir movimento" (`context.reduceMotion`) quem anima troca o movimento por fade ou cor.
abstract final class Motion {
  static const press = Duration(milliseconds: 90); // encolher ao tocar
  static const select = Duration(milliseconds: 160); // chip, check, destaque de palavra
  static const enter = Duration(milliseconds: 280); // conteúdo entrando
  static const sheetExit = Duration(milliseconds: 150);
  static const progress = Duration(milliseconds: 500); // barra enchendo
  static const ring = Duration(milliseconds: 800); // anel da meta
  static const count = Duration(milliseconds: 900); // número subindo (XP)
  static const celebrate = Duration(milliseconds: 1500); // confete

  /// passo da entrada em cascata e teto (o 20º item não espera)
  static const stagger = Duration(milliseconds: 45);
  static const staggerMax = 6;
}

abstract final class MotionCurves {
  /// entrar desacelerando (Material "emphasized decelerate")
  static const enter = Cubic(0.05, 0.7, 0.1, 1);

  /// sair acelerando ("emphasized accelerate")
  static const exit = Cubic(0.3, 0, 0.8, 0.15);

  /// mudança de estado que fica na tela ("emphasized")
  static const standard = Cubic(0.2, 0, 0, 1);
}
