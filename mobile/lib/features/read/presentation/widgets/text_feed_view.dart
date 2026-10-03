import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/routes/routes_path.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/constants/levels.dart';
import '../../../../shared/domain/repositories/articles_repository.dart';
import '../../../../shared/presentation/widgets/empty_state.dart';
import '../../../../shared/presentation/widgets/enter_animation.dart';
import '../../../../shared/presentation/widgets/error_retry.dart';
import '../../../../shared/presentation/widgets/reading_card.dart';
import '../../../../shared/presentation/widgets/skeleton.dart';
import '../cubits/text_feed_cubit.dart';
import 'level_filter.dart';

/// Lista de textos do feed com filtro de nível ("Para você" e "Notícias").
class TextFeedView extends StatelessWidget {
  const TextFeedView({super.key, required this.initialLevel, this.category});

  final EnglishLevel? initialLevel;
  final String? category;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => TextFeedCubit(
        articles: context.read<ArticlesRepository>(),
        initialLevel: initialLevel,
        category: category,
      )..load(),
      child: const _TextFeedBody(),
    );
  }
}

class _TextFeedBody extends StatelessWidget {
  const _TextFeedBody();

  Future<void> _open(BuildContext context, int id) async {
    await Navigator.of(context).pushNamed(RoutesPath.article, arguments: id);
    // voltou do leitor: progresso atualizado
    if (context.mounted) await context.read<TextFeedCubit>().load();
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<TextFeedCubit>();
    final state = context.watch<TextFeedCubit>().state;
    final articles = state.articles;
    return Column(
      children: [
        LevelFilter(selected: state.level, onSelected: cubit.levelSelected),
        Expanded(
          child: switch (state) {
            TextFeedState(error: final error?) => ErrorRetry(message: error, onRetry: cubit.retry),
            _ when articles == null => const _FeedSkeleton(),
            _ => RefreshIndicator(
              onRefresh: cubit.load,
              child: articles.isEmpty
                  ? ListView(
                      children: [
                        EmptyState(
                          illustration: 'assets/images/empty-explore.png',
                          title: cubit.category != null
                              ? 'Nada em ${cubit.category} para este nível'
                              : 'Nenhum texto para este nível ainda',
                          message: 'Escolha outro nível ou volte mais tarde.',
                          actionLabel: state.level != null ? 'Ver todos os níveis' : null,
                          onAction: () => cubit.levelSelected(null),
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(
                        Spaces.lg,
                        Spaces.sm,
                        Spaces.lg,
                        Spaces.xl,
                      ),
                      itemCount: articles.length + 1,
                      separatorBuilder: (_, _) => const SizedBox(height: Spaces.md),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return _FallbackNotice(state: state, category: cubit.category);
                        }
                        final article = articles[index - 1];
                        // só a primeira tela entra em cascata; o resto chega pronto ao rolar
                        return EnterAnimation(
                          index: index - 1,
                          child: ReadingCard(
                            article: article,
                            onTap: () => _open(context, article.id),
                          ),
                        );
                      },
                    ),
            ),
          },
        ),
      ],
    );
  }
}

class _FallbackNotice extends StatelessWidget {
  const _FallbackNotice({required this.state, required this.category});

  final TextFeedState state;
  final String? category;

  @override
  Widget build(BuildContext context) {
    final fallback = state.fallbackLevel;
    if (fallback == null) return const SizedBox.shrink();
    final missing = category != null
        ? 'Ainda não há ${category!.toLowerCase()} no nível ${state.level?.code}.'
        : 'Ainda não há textos no nível ${state.level?.code}.';
    return Container(
      padding: const EdgeInsets.all(Spaces.md),
      decoration: BoxDecoration(
        color: ReadUpColors.primary50,
        borderRadius: BorderRadius.circular(Radii.md),
      ),
      child: Text(
        '$missing Estes são do nível ${fallback.code}, um pouco mais difíceis: toque nas palavras '
        'para traduzir.',
        style: context.textTheme.bodyMedium?.copyWith(color: ReadUpColors.primary700),
      ),
    );
  }
}

class _FeedSkeleton extends StatelessWidget {
  const _FeedSkeleton();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Carregando textos',
      child: const Padding(
        padding: EdgeInsets.all(Spaces.lg),
        child: Column(
          children: [
            Skeleton(height: 132),
            SizedBox(height: Spaces.md),
            Skeleton(height: 132),
            SizedBox(height: Spaces.md),
            Skeleton(height: 132),
          ],
        ),
      ),
    );
  }
}
