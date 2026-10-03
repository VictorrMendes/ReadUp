import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../shared/domain/constants/levels.dart';
import '../../../../shared/domain/models/article_summary.dart';
import '../../../../shared/domain/repositories/articles_repository.dart';

class TextFeedState extends Equatable {
  const TextFeedState({this.level, this.articles, this.fallbackLevel, this.error});

  /// filtro de nível (null = todos)
  final EnglishLevel? level;

  /// null enquanto carrega
  final List<ArticleSummary>? articles;

  /// nível sem nada (ex.: notícias no A1): a lista mostra o nível acima mais próximo, com aviso
  final EnglishLevel? fallbackLevel;
  final String? error;

  @override
  List<Object?> get props => [level, articles, fallbackLevel, error];
}

/// Textos do feed com filtro de nível (aba Ler: "Para você" e "Notícias").
class TextFeedCubit extends Cubit<TextFeedState> {
  TextFeedCubit({required this._articles, EnglishLevel? initialLevel, this.category})
    : super(TextFeedState(level: initialLevel));

  final ArticlesRepository _articles;

  /// só uma categoria (ex.: "Notícias"); sem ela, todos os textos públicos
  final String? category;

  // descarta a resposta de um filtro antigo que chegue depois do atual
  var _request = 0;

  /// Carrega (ou recarrega mantendo a lista na tela: puxar para atualizar, voltar do leitor).
  Future<void> load() async {
    final request = ++_request;
    final level = state.level;
    try {
      var articles = await _articles.list(level: level, category: category);
      // filtro trocado enquanto carregava: nem busca os níveis acima
      if (request != _request || isClosed) return;
      EnglishLevel? fallback;
      if (articles.isEmpty && level != null) {
        for (final above in EnglishLevel.values.skip(level.index + 1)) {
          final candidates = await _articles.list(level: above, category: category);
          if (candidates.isNotEmpty) {
            articles = candidates;
            fallback = above;
            break;
          }
        }
      }
      if (request != _request || isClosed) return;
      emit(TextFeedState(level: level, articles: articles, fallbackLevel: fallback));
    } on RequestFailure catch (failure) {
      if (request != _request || isClosed) return;
      emit(TextFeedState(level: level, error: failure.message));
    }
  }

  Future<void> levelSelected(EnglishLevel? level) {
    emit(TextFeedState(level: level));
    return load();
  }

  Future<void> retry() => levelSelected(state.level);
}
