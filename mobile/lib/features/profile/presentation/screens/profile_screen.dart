import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/services/floating_translator.dart';
import '../../../../core/services/reminders.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/models/achievement.dart';
import '../../../../shared/domain/models/stats.dart';
import '../../../../shared/presentation/cubits/streak_visibility_cubit.dart';
import '../../../../shared/presentation/widgets/error_retry.dart';
import '../../../../shared/presentation/widgets/level_badge.dart';
import '../../../../shared/presentation/widgets/option_list.dart';
import '../../../../shared/presentation/widgets/preference_options.dart';
import '../../../../shared/presentation/widgets/skeleton.dart';
import '../../../auth/domain/models/user.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../cubits/profile_cubit.dart';
import '../widgets/achievement_badge.dart';
import '../widgets/stat_tile.dart';
import '../widgets/week_chart.dart';

/// Perfil: quem sou, quanto já li, conquistas e as escolhas (nível, meta, lembrete, ofensiva).
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.user});

  final User user;

  Future<void> _save(BuildContext context, Future<bool> change) async {
    // salvou: o usuário recarregado traz o novo nível/meta para todo o app
    if (await change && context.mounted) {
      context.read<AuthBloc>().add(const UserRefreshRequested());
    }
  }

  Future<void> _signOut(BuildContext context) async {
    final auth = context.read<AuthBloc>();
    final floating = context.read<FloatingTranslator>();
    // os lembretes falam da ofensiva de quem saiu; a bolha usa a sessão dela
    await context.read<Reminders>().cancelAll();
    await floating.stop();
    auth.add(const LogoutRequested());
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<ProfileCubit>().state;
    final cubit = context.read<ProfileCubit>();
    final streakHidden = context.watch<StreakVisibilityCubit>().state ?? false;
    final text = context.textTheme;

    return BlocListener<ProfileCubit, ProfileState>(
      listenWhen: (previous, current) =>
          (!previous.saved && current.saved) || (current.error != null && previous.error == null),
      listener: (context, state) {
        final messenger = ScaffoldMessenger.of(context)..hideCurrentSnackBar();
        if (state.error case final error?) {
          messenger.showSnackBar(SnackBar(content: Text(error)));
        } else {
          messenger.showSnackBar(
            const SnackBar(content: Text('Salvo'), duration: Duration(seconds: 2)),
          );
          cubit.savedShown();
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Perfil')),
        body: RefreshIndicator(
          onRefresh: cubit.load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(Spaces.xl, Spaces.sm, Spaces.xl, Spaces.xxl),
            children: [
              _IdentityCard(user: user),
              const SizedBox(height: Spaces.xl),
              if (state.summary case final summary?) ...[
                _Stats(summary: summary, streakHidden: streakHidden),
                if (state.week case final week? when week.isNotEmpty) ...[
                  const SizedBox(height: Spaces.lg),
                  WeekChart(days: week),
                ],
                if (state.achievements case final achievements? when achievements.isNotEmpty) ...[
                  const SizedBox(height: Spaces.xl),
                  _Achievements(achievements: achievements),
                ],
              ] else if (state.statsError)
                ErrorRetry(message: 'Não deu para carregar seus números.', onRetry: cubit.load)
              else
                Semantics(
                  container: true,
                  label: 'Carregando',
                  child: const Column(
                    children: [
                      Skeleton(height: 220),
                      SizedBox(height: Spaces.lg),
                      Skeleton(height: 180),
                    ],
                  ),
                ),
              const SizedBox(height: Spaces.xl),
              _Section(
                title: 'Nível de inglês',
                child: OptionList(
                  options: levelOptions,
                  value: user.englishLevel,
                  enabled: !state.saving,
                  onChanged: (level) => _save(context, cubit.setLevel(level)),
                ),
              ),
              _Section(
                title: 'Meta diária',
                child: OptionList(
                  options: goalOptionItems,
                  value: user.dailyGoal,
                  enabled: !state.saving,
                  onChanged: (goal) => _save(context, cubit.setGoal(goal)),
                ),
              ),
              _Section(
                title: 'Lembrete diário',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (state.reminderDenied) ...[
                      Semantics(
                        liveRegion: true,
                        child: Text(
                          'As notificações estão bloqueadas no aparelho. Libere nas configurações '
                          'para receber o lembrete.',
                          style: text.bodyMedium?.copyWith(color: ReadUpColors.errorText),
                        ),
                      ),
                      const SizedBox(height: Spaces.md),
                    ],
                    OptionList(
                      options: reminderOptions,
                      value: state.reminder,
                      enabled: state.reminder != null,
                      onChanged: (time) => unawaited(cubit.setReminder(time)),
                    ),
                  ],
                ),
              ),
              Card(
                child: SwitchListTile(
                  value: !streakHidden,
                  onChanged: (show) {
                    Haptics.select();
                    unawaited(context.read<StreakVisibilityCubit>().setHidden(!show));
                  },
                  title: const Text('Mostrar ofensiva'),
                  subtitle: const Text('Desligada, some do Início e dos lembretes.'),
                ),
              ),
              const SizedBox(height: Spaces.xl),
              OutlinedButton.icon(
                onPressed: () => _signOut(context),
                icon: const Icon(Icons.logout),
                label: const Text('Sair'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IdentityCard extends StatelessWidget {
  const _IdentityCard({required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final initials = user.name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0].toUpperCase())
        .join();
    return Row(
      children: [
        ExcludeSemantics(
          child: CircleAvatar(
            radius: 32,
            backgroundColor: ReadUpColors.primary100,
            child: Text(initials, style: text.titleLarge?.copyWith(color: ReadUpColors.primary700)),
          ),
        ),
        const SizedBox(width: Spaces.lg),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(user.name, style: text.titleLarge),
              Text(
                user.email,
                style: text.bodyMedium?.copyWith(color: ReadUpColors.textSecondary),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        if (user.englishLevel case final level?) LevelBadge(label: level.code, highlighted: true),
      ],
    );
  }
}

class _Stats extends StatelessWidget {
  const _Stats({required this.summary, required this.streakHidden});

  final StatsSummary summary;
  final bool streakHidden;

  @override
  Widget build(BuildContext context) {
    final s = summary;
    return _Grid(
      children: [
        if (!streakHidden) ...[
          StatTile(
            value: s.streakCurrent.formatted,
            label: s.streakCurrent == 1 ? 'dia de ofensiva' : 'dias de ofensiva',
            icon: const Icon(Icons.local_fire_department, color: ReadUpColors.streak),
          ),
          StatTile(value: s.streakLongest.formatted, label: 'dias na maior ofensiva'),
        ],
        StatTile(
          value: s.xpTotal.formatted,
          label: 'XP',
          icon: const Icon(Icons.star_rounded, color: ReadUpColors.gold600),
        ),
        StatTile(value: s.wordsTotal.formatted, label: 'palavras lidas'),
        StatTile(value: s.minutesTotal.formatted, label: 'minutos lendo'),
        StatTile(
          value: s.textsCompletedTotal.formatted,
          label: s.textsCompletedTotal == 1 ? 'texto concluído' : 'textos concluídos',
        ),
        StatTile(
          value: '${s.booksCompleted.formatted} de ${s.booksStarted.formatted}',
          label: 'livros concluídos',
        ),
        StatTile(
          value: s.wordsSavedTotal.formatted,
          label: s.wordsSavedTotal == 1 ? 'palavra salva' : 'palavras salvas',
        ),
      ],
    );
  }
}

class _Achievements extends StatelessWidget {
  const _Achievements({required this.achievements});

  final List<Achievement> achievements;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final unlocked = achievements.where((a) => a.unlocked).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          label: 'Conquistas, $unlocked de ${achievements.length} desbloqueadas',
          excludeSemantics: true,
          child: Row(
            children: [
              Expanded(child: Text('Conquistas', style: text.titleLarge)),
              Text(
                '$unlocked / ${achievements.length}',
                style: text.bodyMedium?.copyWith(color: ReadUpColors.textSecondary),
              ),
            ],
          ),
        ),
        const SizedBox(height: Spaces.md),
        _Grid(children: [for (final a in achievements) AchievementBadge(achievement: a)]),
      ],
    );
  }
}

/// Duas colunas; cada linha com a altura do item mais alto (texto grande não corta).
class _Grid extends StatelessWidget {
  const _Grid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < children.length; i += 2) ...[
          if (i > 0) const SizedBox(height: Spaces.md),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: children[i]),
                const SizedBox(width: Spaces.md),
                Expanded(child: i + 1 < children.length ? children[i + 1] : const SizedBox()),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Spaces.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(title, style: context.textTheme.titleLarge)),
          const SizedBox(height: Spaces.md),
          child,
        ],
      ),
    );
  }
}
