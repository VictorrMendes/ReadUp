import 'package:equatable/equatable.dart';

import '../../../../shared/domain/constants/levels.dart';

class User extends Equatable {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.englishLevel,
    required this.dailyGoal,
  });

  factory User.fromJson(Map<String, Object?> json) => User(
    id: json['id']! as int,
    name: json['name']! as String,
    email: json['email']! as String,
    englishLevel: EnglishLevel.fromCode(json['english_level'] as String?),
    dailyGoal: json['daily_goal'] as int?,
  );

  final int id;
  final String name;
  final String email;
  final EnglishLevel? englishLevel;
  final int? dailyGoal;

  /// Nível e meta escolhidos: sem eles, o app manda para o onboarding.
  bool get isOnboarded => englishLevel != null && dailyGoal != null;

  @override
  List<Object?> get props => [id, name, email, englishLevel, dailyGoal];
}
