import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

import '../../../core/extensions/number_extension.dart';

class Achievement extends Equatable {
  const Achievement({
    required this.id,
    required this.title,
    required this.icon,
    required this.description,
    required this.target,
    required this.current,
    required this.unlocked,
  });

  factory Achievement.fromJson(Map<String, Object?> json) => Achievement(
    id: json['id']! as String,
    title: json['title']! as String,
    icon: json['icon']! as String,
    description: json['description']! as String,
    target: json['target']! as int,
    current: json['current']! as int,
    unlocked: json['unlocked']! as bool,
  );

  final String id;
  final String title;

  /// nome do ícone vindo da API (ex.: "flame-outline")
  final String icon;
  final String description;
  final int target;

  /// limitado ao alvo
  final int current;
  final bool unlocked;

  double get fraction => target == 0 ? 1 : (current / target).clamp(0, 1).toDouble();

  /// "faltam 2 textos" / "falta 1 texto" / "faltam 680 palavras"
  String get remainingLabel {
    final left = (target - current).clamp(0, target);
    return '${left == 1 ? 'falta' : 'faltam'} ${left.formatted} ${unitFor(left)}';
  }

  /// unidade pelo tipo de conquista (o id é estável)
  String unitFor(int count) {
    if (id.startsWith('words-')) return 'palavras';
    if (id == 'first-text' || id.startsWith('texts-')) return count == 1 ? 'texto' : 'textos';
    if (id.startsWith('goal-')) return count == 1 ? 'dia com meta' : 'dias com meta';
    return count == 1 ? 'dia seguido' : 'dias seguidos';
  }

  IconData get iconData => switch (icon) {
    'book-outline' => Icons.menu_book_outlined,
    'flag-outline' => Icons.flag_outlined,
    'flame-outline' => Icons.local_fire_department_outlined,
    'library-outline' => Icons.local_library_outlined,
    'reader-outline' => Icons.chrome_reader_mode_outlined,
    _ => Icons.military_tech_outlined,
  };

  @override
  List<Object?> get props => [id, current, unlocked];
}

/// "Próxima conquista": entre as bloqueadas, a mais perto de sair; empate fica com a primeira do
/// catálogo. null quando todas já foram desbloqueadas.
Achievement? nextAchievement(List<Achievement> achievements) {
  Achievement? best;
  for (final a in achievements) {
    if (a.unlocked) continue;
    if (best == null || a.fraction > best.fraction) best = a;
  }
  return best;
}
