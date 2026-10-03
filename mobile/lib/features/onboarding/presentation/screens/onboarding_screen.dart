import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/domain/constants/levels.dart';
import '../../../../shared/domain/repositories/preferences_repository.dart';
import '../../../../shared/presentation/widgets/loading_button.dart';
import '../../../../shared/presentation/widgets/option_list.dart';
import '../../../auth/domain/models/user.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../cubits/onboarding_cubit.dart';

final _levelOptions = [
  for (final level in EnglishLevel.values)
    OptionItem(value: level, label: level.code, description: level.description),
];
final _goalOptions = [
  for (final words in goalOptions)
    OptionItem(
      value: words,
      label: '$words palavras',
      description: '~${(words / wordsPerMinute).ceil()} min por dia',
    ),
];

/// Primeira escolha: nível e meta. Dá para mudar depois no Perfil.
class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key, required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => OnboardingCubit(
        repository: context.read<PreferencesRepository>(),
        level: user.englishLevel,
        goal: user.dailyGoal,
      ),
      child: BlocListener<OnboardingCubit, OnboardingState>(
        listenWhen: (previous, current) => !previous.done && current.done,
        listener: (context, _) => context.read<AuthBloc>().add(const UserRefreshRequested()),
        child: const _OnboardingView(),
      ),
    );
  }
}

class _OnboardingView extends StatelessWidget {
  const _OnboardingView();

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final state = context.watch<OnboardingCubit>().state;
    final cubit = context.read<OnboardingCubit>();
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(Spaces.xl),
                children: [
                  Image.asset(
                    'assets/images/mascot.png',
                    height: 120,
                    alignment: Alignment.centerLeft,
                    excludeFromSemantics: true,
                  ),
                  const SizedBox(height: Spaces.lg),
                  Text('Vamos começar', style: text.headlineLarge),
                  const SizedBox(height: Spaces.sm),
                  Text(
                    'Escolha seu nível e quanto quer ler por dia. Dá para mudar depois no Perfil.',
                    style: text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary),
                  ),
                  const SizedBox(height: Spaces.xl),
                  Semantics(
                    header: true,
                    child: Text('Seu nível de inglês', style: text.titleLarge),
                  ),
                  const SizedBox(height: Spaces.md),
                  OptionList(
                    options: _levelOptions,
                    value: state.level,
                    onChanged: cubit.levelSelected,
                    enabled: !state.saving,
                  ),
                  const SizedBox(height: Spaces.lg),
                  Semantics(header: true, child: Text('Meta diária', style: text.titleLarge)),
                  const SizedBox(height: Spaces.md),
                  OptionList(
                    options: _goalOptions,
                    value: state.goal,
                    onChanged: cubit.goalSelected,
                    enabled: !state.saving,
                  ),
                ],
              ),
            ),
            // rodapé fixo: o botão fica sempre visível, fora das listas
            _OnboardingFooter(state: state, onStart: cubit.startRequested),
          ],
        ),
      ),
    );
  }
}

class _OnboardingFooter extends StatelessWidget {
  const _OnboardingFooter({required this.state, required this.onStart});

  final OnboardingState state;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: ReadUpColors.surface,
        border: Border(top: BorderSide(color: ReadUpColors.border)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Spaces.xl, Spaces.md, Spaces.xl, Spaces.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (state.error case final error?) ...[
              Semantics(
                liveRegion: true,
                child: Text(error, style: text.bodyMedium?.copyWith(color: ReadUpColors.errorText)),
              ),
              const SizedBox(height: Spaces.sm),
            ],
            LoadingButton(
              label: 'Começar',
              loading: state.saving,
              onPressed: state.canStart ? onStart : null,
            ),
            if (state.level == null || state.goal == null) ...[
              const SizedBox(height: Spaces.sm),
              Text(
                'Escolha o nível e a meta para começar',
                textAlign: TextAlign.center,
                style: text.bodySmall?.copyWith(color: ReadUpColors.textSecondary),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
