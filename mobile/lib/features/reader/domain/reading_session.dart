import 'dart:async';

import '../../../core/core.dart';
import 'models/progress_result.dart';

typedef SendProgress = Future<ProgressResult> Function(int progress, int seconds);

/// Sessão de leitura de um texto: conta segundos só com o app em primeiro plano, guarda o maior
/// progresso de rolagem e envia a cada 15 s de leitura, ao ir para segundo plano e no [stop].
/// Ao começar e ao voltar para o app, envia 0 s para (re)abrir a sessão no servidor, que não
/// credita o primeiro envio nem o que vem depois de uma pausa longa. Falha de rede ou do servidor
/// guarda os segundos para o próximo envio.
class ReadingSession {
  ReadingSession({required this._send, required int initialProgress, required this.onGains})
    : _maxProgress = initialProgress,
      _sentProgress = initialProgress;

  static const sendEverySeconds = 15;
  static const maxSecondsPerSend = 120; // limite do backend

  final SendProgress _send;

  /// Acumulado a cada resposta (a tela de conclusão usa o último).
  final void Function(SessionGains gains) onGains;

  int _maxProgress;
  int _sentProgress;
  var _pendingSeconds = 0;
  var _secondsSinceSend = 0;
  var _foreground = true;
  var _inFlight = false;
  Timer? _timer;

  // pedido de envio que chegou durante outro envio: roda ao terminar o atual, em vez de se perder
  ({bool open, bool force})? _queued;
  // quem pediu "Concluir leitura" e espera a resposta desse envio
  var _finishers = <Completer<ProgressResult>>[];

  var _xp = 0;
  var _words = 0;
  final _achievements = <AchievementRef>[];
  // estado na primeira resposta (abertura): só conta como "virou na sessão" se mudou depois
  bool? _goalMetBefore;
  bool? _streakActiveBefore;

  void start() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
    unawaited(_flush(open: true));
  }

  void _tick() {
    if (!_foreground) return;
    _pendingSeconds += 1;
    _secondsSinceSend += 1;
    if (_secondsSinceSend >= sendEverySeconds) unawaited(_flush());
  }

  /// App foi para segundo plano (envia o que tem) ou voltou (reabre a sessão no servidor).
  void lifecycleChanged({required bool foreground}) {
    if (foreground == _foreground) return;
    _foreground = foreground;
    unawaited(_flush(open: foreground));
  }

  /// Maior progresso de rolagem visto (0–100).
  void report(double percent) {
    final value = percent.floor();
    if (value > _maxProgress) _maxProgress = value;
  }

  void stop() {
    _timer?.cancel();
    unawaited(_flush());
  }

  /// "Concluir leitura": envia já (progresso 100 e os segundos acumulados) e devolve a resposta
  /// desse envio. Com outro envio em andamento, entra na fila e roda assim que ele terminar.
  Future<ProgressResult> finish() {
    _maxProgress = 100;
    final completer = Completer<ProgressResult>();
    _finishers.add(completer);
    unawaited(_flush(force: true));
    return completer.future;
  }

  /// open: envio de abertura (0 s), mesmo sem nada novo. force: "Concluir leitura", mesmo sem
  /// tempo ou avanço novos (resolve quem espera).
  Future<void> _flush({bool open = false, bool force = false}) async {
    if (_inFlight) {
      _queued = (open: open || (_queued?.open ?? false), force: force || (_queued?.force ?? false));
      return;
    }
    final seconds = open ? 0 : _pendingSeconds.clamp(0, maxSecondsPerSend);
    final progress = _maxProgress;
    if (!open && !force && seconds == 0 && progress <= _sentProgress) return;
    final waiting = force ? _finishers : <Completer<ProgressResult>>[];
    if (force) _finishers = [];

    _inFlight = true;
    _pendingSeconds -= seconds;
    _secondsSinceSend = 0;
    try {
      final result = await _send(progress, seconds);
      _xp += result.xpGained;
      _words += result.wordsCredited;
      _goalMetBefore ??= result.goalMet;
      _streakActiveBefore ??= result.streakActiveToday;
      for (final unlocked in result.achievementsUnlocked) {
        if (!_achievements.contains(unlocked)) _achievements.add(unlocked);
      }
      onGains(
        SessionGains(
          xp: _xp,
          words: _words,
          goalMet: result.goalMet && !_goalMetBefore!,
          streakUp: result.streakActiveToday && !_streakActiveBefore!,
          streak: result.streak,
          achievements: List.unmodifiable(_achievements),
        ),
      );
      if (progress > _sentProgress) _sentProgress = progress;
      for (final f in waiting) {
        f.complete(result);
      }
    } on RequestFailure catch (failure) {
      // rede/servidor: devolve os segundos; outros 4xx não melhoram tentando de novo
      final code = failure.code;
      if (code == null || code >= 500) _pendingSeconds += seconds;
      for (final f in waiting) {
        f.completeError(failure);
      }
    } finally {
      _inFlight = false;
      final next = _queued;
      if (next != null) {
        _queued = null;
        unawaited(_flush(open: next.open, force: next.force));
      }
    }
  }
}
