import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../shared/domain/models/stats.dart';
import '../../../../shared/domain/repositories/stats_repository.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';
import '../../domain/end_state.dart';
import '../../domain/models/article_detail.dart';
import '../../domain/models/progress_result.dart';
import '../../domain/reading_session.dart';
import '../../domain/repositories/reading_repository.dart';

/// Dados da tela de conclusão: meta e recorde depois de concluir (null se falharam).
class Celebration extends Equatable {
  const Celebration({required this.goal, required this.longestStreak});

  final GoalStatus? goal;
  final int? longestStreak;

  @override
  List<Object?> get props => [goal, longestStreak];
}

class ReaderState extends Equatable {
  const ReaderState({
    this.article,
    this.error,
    this.notFound = false,
    this.gains = const SessionGains(),
    this.savedWords = const {},
    this.finishing = false,
    this.finishedHere = false,
    this.endState = const EndReady(),
    this.celebration,
  });

  final ArticleDetail? article;
  final String? error;
  final bool notFound;
  final SessionGains gains;

  /// palavras salvas (sublinhado discreto quando reaparecem no texto)
  final Set<String> savedWords;
  final bool finishing;

  /// concluído pelo toque nesta sessão (o servidor validou)
  final bool finishedHere;
  final EndState endState;

  /// não nulo: a tela de conclusão abre
  final Celebration? celebration;

  bool get done => (article?.summary.completed ?? false) || finishedHere;

  ReaderState copyWith({
    ArticleDetail? article,
    String? error,
    bool? notFound,
    SessionGains? gains,
    Set<String>? savedWords,
    bool? finishing,
    bool? finishedHere,
    EndState? endState,
    Celebration? Function()? celebration,
  }) => ReaderState(
    article: article ?? this.article,
    error: error ?? this.error,
    notFound: notFound ?? this.notFound,
    gains: gains ?? this.gains,
    savedWords: savedWords ?? this.savedWords,
    finishing: finishing ?? this.finishing,
    finishedHere: finishedHere ?? this.finishedHere,
    endState: endState ?? this.endState,
    celebration: celebration != null ? celebration() : this.celebration,
  );

  @override
  List<Object?> get props => [
    article,
    error,
    notFound,
    gains,
    savedWords,
    finishing,
    finishedHere,
    endState,
    celebration,
  ];
}

/// Leitor: abre o texto, mantém a sessão de leitura e conduz o "Concluir leitura".
class ReaderCubit extends Cubit<ReaderState> {
  ReaderCubit({
    required this._reading,
    required this._stats,
    required this._vocabulary,
    required this.articleId,
  }) : super(const ReaderState());

  final ReadingRepository _reading;
  final StatsRepository _stats;
  final VocabularyRepository _vocabulary;
  final int articleId;
  ReadingSession? _session;

  Future<void> load() async {
    try {
      final article = await _reading.article(articleId);
      if (isClosed) return;
      emit(ReaderState(article: article));
      _session = ReadingSession(
        send: (progress, seconds) =>
            _reading.saveProgress(articleId: articleId, progress: progress, seconds: seconds),
        initialProgress: article.summary.progress,
        onGains: (gains) {
          if (!isClosed) emit(state.copyWith(gains: gains));
        },
      )..start();
      await refreshSavedWords();
    } on RequestFailure catch (failure) {
      if (!isClosed) emit(ReaderState(error: failure.message, notFound: failure.code == 404));
    }
  }

  Future<void> retry() async {
    emit(const ReaderState());
    await load();
  }

  /// Depois de salvar/remover no painel: o sublinhado acompanha.
  Future<void> refreshSavedWords() async {
    try {
      final words = await _vocabulary.list();
      if (!isClosed) emit(state.copyWith(savedWords: {for (final w in words) w.word}));
    } on RequestFailure {
      // sem a lista: só não sublinha
    }
  }

  void reportProgress(double percent) => _session?.report(percent);

  void lifecycleChanged({required bool foreground}) =>
      _session?.lifecycleChanged(foreground: foreground);

  /// "Concluir leitura": envio imediato; o servidor diz se o texto foi lido de verdade.
  Future<void> finish() async {
    final session = _session;
    final article = state.article;
    if (session == null || article == null || state.finishing) return;
    emit(state.copyWith(finishing: true));
    try {
      final response = await session.finish();
      if (!response.completed) {
        return emit(
          state.copyWith(
            finishing: false,
            endState: EndTooFast(secondsToComplete(article.summary.wordCount, response.wordsRead)),
          ),
        );
      }
      // meta e recorde para a tela de conclusão; falha só esconde essas partes
      final goal = _stats.goal().then<GoalStatus?>((v) => v, onError: (_) => null);
      final summary = _stats.summary().then<StatsSummary?>((v) => v, onError: (_) => null);
      final celebration = Celebration(
        goal: await goal,
        longestStreak: (await summary)?.streakLongest,
      );
      if (isClosed) return;
      emit(
        state.copyWith(
          finishing: false,
          finishedHere: true,
          endState: const EndDone(),
          celebration: () => celebration,
        ),
      );
    } on RequestFailure {
      if (!isClosed) emit(state.copyWith(finishing: false, endState: const EndError()));
    }
  }

  void celebrationClosed() => emit(state.copyWith(celebration: () => null));

  @override
  Future<void> close() {
    _session?.stop(); // envia o que ficou ao sair do texto
    return super.close();
  }
}
