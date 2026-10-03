import 'package:flutter_test/flutter_test.dart';
import 'package:readup/shared/domain/constants/levels.dart';
import 'package:readup/shared/domain/models/achievement.dart';
import 'package:readup/shared/domain/models/article_summary.dart';
import 'package:readup/shared/domain/models/stats.dart';

import '../../fakes/fixtures.dart';

void main() {
  test('texto do feed vem da API com nível e progresso', () {
    final a = ArticleSummary.fromJson(articleJson(progress: 40));
    expect(a.difficulty, EnglishLevel.b1);
    expect(a.inProgress, isTrue);
    expect(a.bookId, isNull);
  });

  test('próximo texto: prefere um não começado, fora o atual e os concluídos', () {
    final list = [
      article(id: 1, completed: true),
      article(id: 2, progress: 30),
      article(id: 3),
      article(id: 4),
    ];
    expect(pickNextText(list)?.id, 3);
    expect(pickNextText(list, excludeId: 3)?.id, 4);
    expect(pickNextText([article(id: 2, progress: 30)])?.id, 2);
    expect(pickNextText([article(id: 1, completed: true)]), isNull);
  });

  test('próxima conquista: a bloqueada mais perto de sair', () {
    const almost = Achievement(
      id: 'texts-5',
      title: 'Cinco textos',
      icon: 'book-outline',
      description: '',
      target: 5,
      current: 4,
      unlocked: false,
    );
    const done = Achievement(
      id: 'first-text',
      title: 'Primeira leitura',
      icon: 'book-outline',
      description: '',
      target: 1,
      current: 1,
      unlocked: true,
    );
    expect(nextAchievement([done, achievementWords, almost]), almost);
    expect(nextAchievement([done]), isNull);
  });

  test('quanto falta, com a unidade certa e singular', () {
    expect(achievementWords.remainingLabel, 'faltam 680 palavras');
    const oneText = Achievement(
      id: 'texts-5',
      title: '',
      icon: 'x',
      description: '',
      target: 5,
      current: 4,
      unlocked: false,
    );
    expect(oneText.remainingLabel, 'falta 1 texto');
  });

  test('backend antigo sem escudos/streak_kept: campos novos com padrão', () {
    final summary = StatsSummary.fromJson({
      'xp_total': 1,
      'words_total': 1,
      'texts_completed_total': 0,
      'minutes_total': 0,
      'words_saved_total': 0,
      'books_started': 0,
      'books_completed': 0,
      'streak_current': 0,
      'streak_longest': 0,
      'streak_active_today': false,
    });
    expect(summary.streakFreezes, 0);
    final d = DailyStat.fromJson({
      'day': '2026-03-09',
      'words_read': 0,
      'xp': 0,
      'goal_met': false,
    });
    expect(d.streakKept, isFalse);
  });
}
