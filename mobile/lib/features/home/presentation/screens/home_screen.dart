import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/services/floating_translator.dart';
import '../../../../core/services/reminders.dart';
import '../../../../core/routes/routes_path.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/presentation/cubits/streak_visibility_cubit.dart';
import '../../../../shared/presentation/widgets/enter_animation.dart';
import '../../../../shared/presentation/widgets/floating_translator_tile.dart';
import '../../../../shared/presentation/widgets/reading_card.dart';
import '../../../../shared/presentation/widgets/skeleton.dart';
import '../../../auth/domain/models/user.dart';
import '../../../home_tabs/presentation/cubits/home_tabs_cubit.dart';
import '../../domain/home_texts.dart';
import '../blocs/home_bloc.dart';
import '../widgets/daily_goal_card.dart';
import '../widgets/home_hero.dart';
import '../widgets/next_achievement_card.dart';
import '../widgets/streak_card.dart';

// arte do topo: 390×280 (escala pela largura); os cartões começam 64 antes do fim dela
const _heroRatio = 280 / 390;
const _cardOverlap = 64.0;

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.user});

  final User user;

  Future<void> _reload(BuildContext context) async {
    final bloc = context.read<HomeBloc>()..add(HomeLoadRequested(level: user.englishLevel));
    await bloc.stream.firstWhere((state) => state is! HomeLoading);
  }

  Future<void> _openArticle(BuildContext context, int id) async {
    await Navigator.of(context).pushNamed(RoutesPath.article, arguments: id);
    // voltou do leitor: meta, ofensiva e "continuar lendo" mudaram
    if (context.mounted) context.read<HomeBloc>().add(HomeLoadRequested(level: user.englishLevel));
  }

  /// Reagenda os lembretes: hoje sai da lista se o dia já está garantido; a ofensiva só aparece
  /// no texto se estiver visível.
  void _syncReminders(BuildContext context, HomeData data) {
    final summary = data.summary;
    final hidden = context.read<StreakVisibilityCubit>().state ?? false;
    unawaited(
      context.read<Reminders>().sync(
        doneToday: data.goal.completed || (summary?.streakActiveToday ?? false),
        streak: hidden ? 0 : summary?.streakCurrent ?? 0,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final heroHeight = width * _heroRatio;
    final state = context.watch<HomeBloc>().state;
    final data = state is HomeLoaded ? state.data : null;

    return BlocListener<HomeBloc, HomeState>(
      listenWhen: (_, current) => current is HomeLoaded,
      listener: (context, state) => _syncReminders(context, (state as HomeLoaded).data),
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        // ícones claros da barra de status sobre a arte índigo
        value: SystemUiOverlayStyle.light,
        child: Scaffold(
          body: RefreshIndicator(
            onRefresh: () => _reload(context),
            child: ListView(
              padding: const EdgeInsets.only(bottom: Spaces.xxl),
              children: [
                Stack(
                  children: [
                    Image.asset(
                      'assets/images/home-hero.png',
                      width: width,
                      height: heroHeight,
                      fit: BoxFit.cover,
                      excludeFromSemantics: true,
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        HomeHero(
                          name: user.name,
                          minHeight: heroHeight - _cardOverlap,
                          xp: data?.summary?.xpTotal,
                          message: data == null ? null : heroMessage(data.goal),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: Spaces.xl),
                          child: switch (state) {
                            HomeLoading() => const _HomeSkeleton(),
                            HomeFailure(:final message) => _HomeError(
                              message: message,
                              onRetry: () => _reload(context),
                            ),
                            HomeLoaded(:final data) => _HomeContent(
                              data: data,
                              onOpenArticle: (id) => _openArticle(context, id),
                            ),
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeContent extends StatelessWidget {
  const _HomeContent({required this.data, required this.onOpenArticle});

  final HomeData data;
  final ValueChanged<int> onOpenArticle;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final streakHidden = context.watch<StreakVisibilityCubit>().state;
    final target = data.readTarget;
    final goTo = target == null
        ? () => context.read<HomeTabsCubit>().select(HomeTab.read)
        : () => onOpenArticle(target.id);
    final next = data.nextAchievementToUnlock;
    final cards = <Widget>[
      if (data.goal.target case final goalTarget?)
        DailyGoalCard(
          goal: data.goal,
          target: goalTarget,
          actionLabel: goalActionLabel(
            completed: data.goal.completed,
            hasInProgress: data.continueReading != null,
          ),
          onAction: goTo,
        ),
      // interruptor da bolha logo abaixo da meta, sem rolar (só no Android)
      if (context.read<FloatingTranslator>().supported) const FloatingTranslatorTile(),
      if (data.summary case final summary? when streakHidden == false)
        StreakCard(summary: summary, goalMetToday: data.goal.completed, week: data.week),
      if (next != null) NextAchievementCard(achievement: next),
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(
              data.continueReading != null ? 'Continuar lendo' : 'Sugerido para você',
              style: text.titleLarge,
            ),
          ),
          const SizedBox(height: Spaces.md),
          if (target != null)
            ReadingCard(article: target, onTap: goTo)
          else ...[
            Text(
              'Você já leu todos os textos do seu nível.',
              style: text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary),
            ),
            const SizedBox(height: Spaces.md),
            FilledButton(onPressed: goTo, child: const Text('Ver textos')),
          ],
        ],
      ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, card) in cards.indexed) ...[
          if (i > 0) const SizedBox(height: Spaces.lg),
          // cartões entram em cascata uma vez, quando os dados chegam (não a cada recarga)
          EnterAnimation(index: i, child: card),
        ],
      ],
    );
  }
}

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Carregando',
      child: const Column(
        children: [
          Skeleton(height: 236),
          SizedBox(height: Spaces.lg),
          Skeleton(height: 148),
        ],
      ),
    );
  }
}

class _HomeError extends StatelessWidget {
  const _HomeError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Spaces.xl),
        child: Column(
          children: [
            Image.asset('assets/images/mascot.png', width: 96, excludeFromSemantics: true),
            const SizedBox(height: Spaces.md),
            Text('Não foi possível carregar o Início.', style: context.textTheme.titleMedium),
            const SizedBox(height: Spaces.xs),
            Text(
              message,
              textAlign: TextAlign.center,
              style: context.textTheme.bodyMedium?.copyWith(color: ReadUpColors.textSecondary),
            ),
            const SizedBox(height: Spaces.lg),
            FilledButton(onPressed: onRetry, child: const Text('Tentar novamente')),
          ],
        ),
      ),
    );
  }
}
