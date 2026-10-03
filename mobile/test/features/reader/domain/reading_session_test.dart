import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:readup/core/core.dart';
import 'package:readup/features/reader/domain/models/progress_result.dart';
import 'package:readup/features/reader/domain/reading_session.dart';

ProgressResult result({
  int xp = 0,
  int words = 0,
  bool goalMet = false,
  bool active = false,
  int streak = 0,
  bool completed = false,
  List<AchievementRef> achievements = const [],
}) => ProgressResult(
  progress: 0,
  wordsRead: 0,
  wordsCredited: words,
  completed: completed,
  xpGained: xp,
  goalMet: goalMet,
  streak: streak,
  streakActiveToday: active,
  achievementsUnlocked: achievements,
);

void main() {
  late List<(int, int)> sent;
  late List<SessionGains> gains;

  ReadingSession session(
    Future<ProgressResult> Function(int progress, int seconds) answer, {
    int initial = 0,
  }) {
    sent = [];
    gains = [];
    return ReadingSession(
      send: (progress, seconds) {
        sent.add((progress, seconds));
        return answer(progress, seconds);
      },
      initialProgress: initial,
      onGains: gains.add,
    );
  }

  test('abre com 0 s e envia a cada 15 s de leitura com o maior progresso', () {
    fakeAsync((async) {
      final s = session((_, _) async => result())..start();
      async.flushMicrotasks();
      expect(sent, [(0, 0)]);

      s
        ..report(30.7)
        ..report(10); // rolar para cima não diminui
      async.elapse(const Duration(seconds: 15));
      expect(sent.last, (30, 15));
      s.stop();
    });
  });

  test('em segundo plano não conta tempo; sair envia, voltar reabre com 0 s', () {
    fakeAsync((async) {
      final s = session((_, _) async => result())..start();
      async.elapse(const Duration(seconds: 5));
      s.lifecycleChanged(foreground: false);
      async.flushMicrotasks();
      expect(sent.last, (0, 5));

      async.elapse(const Duration(seconds: 60)); // escondido: nada acumula
      s.lifecycleChanged(foreground: true);
      async.flushMicrotasks();
      expect(sent.last, (0, 0));
      expect(sent, hasLength(3));
      s.stop();
    });
  });

  test('falha de rede guarda os segundos para o próximo envio', () {
    fakeAsync((async) {
      var fail = true;
      final s = session((progress, seconds) async {
        if (seconds > 0 && fail) {
          fail = false;
          throw const RequestFailure(message: 'Sem conexão');
        }
        return result();
      })..start();
      async.elapse(const Duration(seconds: 30));
      // o envio dos 15 s falhou: os 15 s voltam e vão junto com os 15 seguintes
      expect(sent.map((e) => e.$2), [0, 15, 30]);
      s.stop();
    });
  });

  test('concluir envia progresso 100 com os segundos acumulados e devolve a resposta', () {
    fakeAsync((async) {
      final s = session((_, _) async => result(completed: true))..start();
      async.elapse(const Duration(seconds: 7));
      ProgressResult? answer;
      s.finish().then((r) => answer = r);
      async.flushMicrotasks();
      expect(sent.last, (100, 7));
      expect(answer?.completed, isTrue);
      s.stop();
    });
  });

  test('soma XP e palavras; meta e ofensiva só "viram" se mudaram depois da abertura', () {
    fakeAsync((async) {
      final answers = [
        result(streak: 4), // abertura: ofensiva de ontem, hoje ainda não contou
        result(xp: 9, words: 60, active: true, streak: 5),
        result(xp: 56, words: 150, active: true, goalMet: true, streak: 5),
      ];
      final s = session((_, _) async => answers.removeAt(0))..start();
      s.report(20);
      async.elapse(const Duration(seconds: 15));
      s.report(60);
      async.elapse(const Duration(seconds: 15));

      expect(
        gains.last,
        const SessionGains(xp: 65, words: 210, goalMet: true, streakUp: true, streak: 5),
      );
      s.stop();
    });
  });

  test('ofensiva e meta já garantidas antes da sessão não contam como novidade', () {
    fakeAsync((async) {
      final s = session((_, _) async => result(active: true, goalMet: true, streak: 5))..start();
      s.report(50);
      async.elapse(const Duration(seconds: 15));
      expect(gains.last.streakUp, isFalse);
      expect(gains.last.goalMet, isFalse);
      s.stop();
    });
  });

  test('envio pedido durante outro envio não se perde (roda quando o primeiro termina)', () {
    fakeAsync((async) {
      final s = session((_, _) => Future.delayed(const Duration(seconds: 2), result))..start();
      async.elapse(const Duration(milliseconds: 500)); // abertura ainda no ar
      s.stop(); // pede envio durante a abertura
      async.elapse(const Duration(seconds: 5));
      expect(sent, hasLength(1)); // nada novo (0 s, sem avanço): a fila não envia à toa

      final t = session((_, _) => Future.delayed(const Duration(seconds: 2), result))..start();
      t.report(40);
      async.elapse(const Duration(milliseconds: 500));
      t.stop();
      async.elapse(const Duration(seconds: 5));
      expect(sent, [(0, 0), (40, 0)]);
    });
  });
}
