import 'package:readup/features/auth/domain/models/user.dart';
import 'package:readup/features/read/domain/models/book.dart';
import 'package:readup/shared/domain/models/achievement.dart';
import 'package:readup/shared/domain/models/article_summary.dart';
import 'package:readup/shared/domain/models/stats.dart';
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

Map<String, Object?> articleJson({int id = 10, int progress = 0, bool completed = false}) => {
  'id': id,
  'title': 'The science of sleep',
  'category': 'Saúde',
  'difficulty': 'B1',
  'word_count': 640,
  'estimated_minutes': 4,
  'source': 'ReadUp',
  'published_at': null,
  'progress': progress,
  'completed': completed,
  'book_id': null,
  'book_title': null,
};

ArticleSummary article({int id = 10, int progress = 0, bool completed = false}) =>
    ArticleSummary.fromJson(articleJson(id: id, progress: progress, completed: completed));

const goalOpen = GoalStatus(target: 500, wordsToday: 320, remaining: 180, completed: false);
const goalDone = GoalStatus(target: 500, wordsToday: 620, remaining: 0, completed: true);

StatsSummary summaryWith({int streak = 3, int longest = 7, bool active = true, int freezes = 2}) =>
    StatsSummary(
      xpTotal: 1240,
      wordsTotal: 18400,
      textsCompletedTotal: 12,
      minutesTotal: 95,
      wordsSavedTotal: 30,
      booksStarted: 1,
      booksCompleted: 0,
      streakCurrent: streak,
      streakLongest: longest,
      streakActiveToday: active,
      streakFreezes: freezes,
    );

DailyStat day(String date, {bool kept = false, bool met = false}) =>
    DailyStat(day: date, wordsRead: kept ? 100 : 0, xp: 0, goalMet: met, streakKept: kept || met);

final week = [
  day('2026-03-09', met: true),
  day('2026-03-10', kept: true),
  day('2026-03-11'),
  day('2026-03-12', kept: true),
  day('2026-03-13'),
  day('2026-03-14', met: true),
  day('2026-03-15'),
];

const achievementWords = Achievement(
  id: 'words-1k',
  title: 'Mil palavras',
  icon: 'reader-outline',
  description: 'Leia 1.000 palavras',
  target: 1000,
  current: 320,
  unlocked: false,
);

Map<String, Object?> bookJson({
  int id = 5,
  int progress = 25,
  List<Map<String, Object?>>? chapters,
}) => {
  'id': id,
  'title': 'harry-potter-and-the-stone',
  'page_count': 223,
  'word_count': 77000,
  'chapter_count': 2,
  'words_read': 19250,
  'progress': progress,
  'created_at': '2026-10-01T12:00:00Z',
  'chapters': ?chapters,
};

Map<String, Object?> chapterJson(
  int id,
  int position, {
  bool completed = false,
  int progress = 0,
}) => {
  'id': id,
  'title': 'Chapter $position',
  'position': position,
  'word_count': 2500,
  'estimated_minutes': 12,
  'progress': progress,
  'completed': completed,
};

final bookDetail = BookDetail.fromJson(
  bookJson(
    chapters: [
      chapterJson(101, 1, completed: true, progress: 100),
      chapterJson(102, 2, progress: 30),
    ],
  ),
);
