import 'package:readup/features/auth/domain/models/user.dart';
import 'package:readup/shared/domain/constants/levels.dart';

const userJson = {
  'id': 1,
  'name': 'Ana',
  'email': 'ana@example.com',
  'english_level': 'B1',
  'created_at': '2026-10-01T12:00:00Z',
  'daily_goal': 500,
};

const onboardedUser = User(
  id: 1,
  name: 'Ana',
  email: 'ana@example.com',
  englishLevel: EnglishLevel.b1,
  dailyGoal: 500,
);

const newUser = User(
  id: 2,
  name: 'Bia',
  email: 'bia@example.com',
  englishLevel: null,
  dailyGoal: null,
);
