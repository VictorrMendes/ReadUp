import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/routes/routes_path.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/article_summary.dart';
import '../../../../shared/domain/models/book_title.dart';
import '../../../../shared/domain/repositories/articles_repository.dart';
import '../../../../shared/domain/repositories/stats_repository.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';
import '../../../../shared/presentation/widgets/error_retry.dart';
import '../../../../shared/presentation/widgets/progress_bar.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../domain/end_state.dart';
import '../../domain/models/article_detail.dart';
import '../../domain/models/reader_settings.dart';
import '../../domain/repositories/reading_repository.dart';
import '../cubits/reader_cubit.dart';
import '../cubits/reader_settings_cubit.dart';
import '../widgets/paragraph_view.dart';
import '../widgets/reader_settings_sheet.dart';
import '../widgets/sentence_sheet.dart';
import '../widgets/text_end.dart';
import '../widgets/word_sheet.dart';
import 'completion_screen.dart';

/// Leitor: texto corrido com palavras tocáveis, progresso pela rolagem e a conclusão.
class ArticleScreen extends StatelessWidget {
  const ArticleScreen({super.key, required this.articleId});

  final int articleId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => ReaderCubit(
        reading: context.read<ReadingRepository>(),
        stats: context.read<StatsRepository>(),
        vocabulary: context.read<VocabularyRepository>(),
        articleId: articleId,
      )..load(),
      child: const _ReaderView(),
    );
  }
}

class _ReaderView extends StatefulWidget {
  const _ReaderView();

  @override
  State<_ReaderView> createState() => _ReaderViewState();
}

class _ReaderViewState extends State<_ReaderView> {
  final _scroll = ScrollController();
  late final AppLifecycleListener _lifecycle;
  var _progress = 0.0;
  var _resumed = false;
  ReaderSelection? _selection;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    // app em segundo plano não conta tempo; voltar reabre a sessão no servidor
    _lifecycle = AppLifecycleListener(
      onStateChange: (state) => context.read<ReaderCubit>().lifecycleChanged(
        foreground: state == AppLifecycleState.resumed,
      ),
    );
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    final max = _scroll.position.maxScrollExtent;
    // texto que cabe na tela conta como lido por inteiro
    final value = max <= 0 ? 1.0 : (_scroll.offset / max).clamp(0.0, 1.0);
    context.read<ReaderCubit>().reportProgress(value * 100);
    final rounded = (value * 100).round() / 100; // só redesenha quando a barra muda de fato
    if (rounded != _progress) setState(() => _progress = rounded);
  }

  /// Retoma de onde parou, uma vez, quando o texto já foi medido.
  void _resumeOnce(ArticleDetail article) {
    if (_resumed) return;
    _resumed = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      final summary = article.summary;
      if (summary.progress > 0 && !summary.completed) {
        _scroll.jumpTo(_scroll.position.maxScrollExtent * summary.progress / 100);
      }
      _onScroll();
    });
  }

  Future<void> _openSelection(ReaderSelection selection, int articleId) async {
    setState(() => _selection = selection);
    final word = selection.word;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => word == null
          ? SentenceSheet(sentence: selection.sentence, articleId: articleId)
          : WordSheet(
              word: word,
              sentence: selection.sentence,
              articleId: articleId,
              onSavedChanged: context.read<ReaderCubit>().refreshSavedWords,
            ),
    );
    if (mounted) setState(() => _selection = null);
  }

  Future<void> _openNextText(ArticleSummary current) async {
    final navigator = Navigator.of(context);
    final authState = context.read<AuthBloc>().state;
    final level = authState is AuthAuthenticated ? authState.user.englishLevel : null;
    try {
      final list = await context.read<ArticlesRepository>().list(level: level);
      final next = pickNextText(list, excludeId: current.id);
      if (next != null) {
        unawaited(navigator.pushReplacementNamed(RoutesPath.article, arguments: next.id));
        return;
      }
    } on RequestFailure {
      // sem lista: volta para a aba Ler
    }
    navigator.pop();
  }

  ({NavAction? primary, NavAction secondary}) _actions(ArticleDetail article) {
    final summary = article.summary;
    final navigator = Navigator.of(context);
    final NavAction? primary = summary.bookId == null
        ? (label: 'Próximo texto', onPressed: () => _openNextText(summary))
        : article.nextArticleId != null
        ? (
            label: 'Próximo capítulo',
            onPressed: () => navigator.pushReplacementNamed(
              RoutesPath.article,
              arguments: article.nextArticleId,
            ),
          )
        : null;
    final secondary = (
      label: summary.bookId == null ? 'Ver mais textos' : 'Voltar ao livro',
      onPressed: () => navigator.pop(),
    );
    return (primary: primary, secondary: secondary);
  }

  Future<void> _showCompletion(ReaderState state) async {
    final article = state.article!;
    final celebration = state.celebration!;
    final cubit = context.read<ReaderCubit>();
    final navigator = Navigator.of(context);
    final actions = _actions(article);
    final action = await navigator.push<CompletionAction>(
      PageRouteBuilder(
        fullscreenDialog: true,
        transitionDuration: const Duration(milliseconds: 280),
        pageBuilder: (_, _, _) => CompletionScreen(
          articleTitle: article.summary.title,
          minutes: article.summary.estimatedMinutes,
          gains: state.gains,
          goal: celebration.goal,
          longestStreak: celebration.longestStreak,
          primaryLabel: actions.primary?.label,
          secondaryLabel: actions.secondary.label,
        ),
        transitionsBuilder: (_, animation, _, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
    cubit.celebrationClosed();
    switch (action) {
      case CompletionAction.primary:
        actions.primary?.onPressed();
      case CompletionAction.secondary:
        actions.secondary.onPressed();
      case CompletionAction.finishForToday:
        // de volta às abas (o Início recarrega)
        navigator.popUntil((route) => route.isFirst);
      case CompletionAction.close || null:
        break; // volta ao texto
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<ReaderSettingsCubit>().state;
    final theme = settings.theme;
    return BlocConsumer<ReaderCubit, ReaderState>(
      listenWhen: (previous, current) =>
          previous.celebration == null && current.celebration != null,
      listener: (context, state) => _showCompletion(state),
      builder: (context, state) {
        final article = state.article;
        if (article != null) _resumeOnce(article);
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: theme.isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
          child: Scaffold(
            backgroundColor: theme.background,
            appBar: AppBar(
              backgroundColor: theme.background,
              foregroundColor: theme.text,
              shape: Border(bottom: BorderSide(color: theme.border)),
              leading: IconButton(
                tooltip: 'Voltar',
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.of(context).maybePop(),
              ),
              title: article == null
                  ? null
                  : ProgressBar(
                      value: _progress,
                      size: ProgressBarSize.thin,
                      color: theme.link,
                      trackColor: theme.border,
                      semanticLabel: 'Progresso da leitura',
                    ),
              actions: [
                IconButton(
                  tooltip: 'Aparência do texto',
                  icon: const Icon(Icons.text_fields),
                  onPressed: () => showModalBottomSheet<void>(
                    context: context,
                    builder: (_) => BlocProvider.value(
                      value: context.read<ReaderSettingsCubit>(),
                      child: const ReaderSettingsSheet(),
                    ),
                  ),
                ),
              ],
            ),
            body: switch (state) {
              ReaderState(notFound: true) => Center(
                child: Text('Texto não encontrado', style: TextStyle(color: theme.text)),
              ),
              ReaderState(error: final error?) => ErrorRetry(
                message: error,
                onRetry: context.read<ReaderCubit>().retry,
              ),
              _ when article == null => const Center(child: CircularProgressIndicator()),
              _ => _ArticleBody(
                article: article,
                state: state,
                settings: settings,
                scroll: _scroll,
                selection: _selection,
                actions: _actions(article),
                onSelect: (selection) => _openSelection(selection, article.summary.id),
              ),
            },
          ),
        );
      },
    );
  }
}

class _ArticleBody extends StatelessWidget {
  const _ArticleBody({
    required this.article,
    required this.state,
    required this.settings,
    required this.scroll,
    required this.selection,
    required this.actions,
    required this.onSelect,
  });

  final ArticleDetail article;
  final ReaderState state;
  final ReaderSettings settings;
  final ScrollController scroll;
  final ReaderSelection? selection;
  final ({NavAction? primary, NavAction secondary}) actions;
  final ValueChanged<ReaderSelection> onSelect;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final theme = settings.theme;
    final summary = article.summary;
    final paragraphs = article.paragraphs;
    final kind = summary.bookTitle != null ? cleanBookTitle(summary.bookTitle!) : summary.category;
    final meta = [kind, ?summary.difficulty?.code, '${summary.estimatedMinutes} min'].join(' · ');
    final secondary = text.bodyMedium?.copyWith(color: theme.secondary);
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: Spaces.readingMaxWidth),
        child: ListView(
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(Spaces.xl, Spaces.lg, Spaces.xl, Spaces.xxxl),
          children: [
            Semantics(header: true, child: Text(summary.title, style: settings.title)),
            const SizedBox(height: Spaces.sm),
            Wrap(
              spacing: Spaces.md,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(meta, style: secondary),
                if (state.done)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle, size: 16, color: ReadUpColors.success600),
                      const SizedBox(width: Spaces.xs),
                      Text(
                        'Concluído',
                        style: text.bodyMedium?.copyWith(
                          color: theme.text,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: Spaces.xs),
            Text(
              'Toque numa palavra para traduzir · segure para traduzir a frase',
              style: text.bodySmall?.copyWith(color: theme.secondary),
            ),
            const SizedBox(height: Spaces.xl),
            for (final (i, paragraph) in paragraphs.indexed)
              ParagraphView(
                text: paragraph,
                index: i,
                style: settings.body,
                markColor: theme.mark,
                savedColor: theme.link,
                savedWords: state.savedWords,
                selectedChunk: selection?.paragraph == i && selection?.word != null
                    ? selection!.chunk
                    : null,
                selectedSentence: selection?.paragraph == i && selection?.word == null
                    ? selection!.sentenceIndex
                    : null,
                onSelect: onSelect,
              ),
            if (article.attribution case final credit?)
              Text(credit, style: text.bodySmall?.copyWith(color: theme.secondary)),
            TextEnd(
              // já concluído (ao abrir ou agora): "Você já concluiu este texto"
              state: state.done ? const EndDone() : state.endState,
              finishing: state.finishing,
              onFinish: context.read<ReaderCubit>().finish,
              primary: actions.primary,
              secondary: actions.secondary,
              theme: theme,
            ),
          ],
        ),
      ),
    );
  }
}
