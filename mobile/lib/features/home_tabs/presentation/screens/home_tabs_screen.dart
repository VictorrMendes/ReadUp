import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../shared/domain/repositories/articles_repository.dart';
import '../../../../shared/domain/repositories/stats_repository.dart';
import '../../../auth/domain/models/user.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../home/presentation/blocs/home_bloc.dart';
import '../../../home/presentation/screens/home_screen.dart';
import '../../../read/presentation/screens/read_screen.dart';
import '../../../vocabulary/presentation/cubits/vocabulary_cubit.dart';
import '../../../vocabulary/presentation/screens/vocabulary_screen.dart';
import '../../../../shared/domain/repositories/vocabulary_repository.dart';
import '../cubits/home_tabs_cubit.dart';
import '../widgets/bouncy_tab_icon.dart';

const _tabs = [
  (HomeTab.home, 'Início', Icons.home_outlined, Icons.home),
  (HomeTab.read, 'Ler', Icons.menu_book_outlined, Icons.menu_book),
  (HomeTab.vocabulary, 'Vocabulário', Icons.translate_outlined, Icons.translate),
  (HomeTab.profile, 'Perfil', Icons.person_outline, Icons.person),
];

/// Abas do app. Cada aba mantém o estado ao trocar (IndexedStack); o Início recarrega ao voltar.
class HomeTabsScreen extends StatelessWidget {
  const HomeTabsScreen({super.key, required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => HomeTabsCubit()),
        BlocProvider(
          create: (context) => VocabularyCubit(vocabulary: context.read<VocabularyRepository>()),
        ),
        BlocProvider(
          create: (context) => HomeBloc(
            stats: context.read<StatsRepository>(),
            articles: context.read<ArticlesRepository>(),
          )..add(HomeLoadRequested(level: user.englishLevel)),
        ),
      ],
      child: BlocConsumer<HomeTabsCubit, HomeTab>(
        listenWhen: (previous, current) => previous != current,
        // ao entrar na aba: Início e Vocabulário mostram o que mudou (leitura, palavras salvas)
        listener: (context, tab) => switch (tab) {
          HomeTab.home => context.read<HomeBloc>().add(HomeLoadRequested(level: user.englishLevel)),
          HomeTab.vocabulary => context.read<VocabularyCubit>().load(),
          _ => null,
        },
        builder: (context, tab) => Scaffold(
          body: IndexedStack(
            index: tab.index,
            children: [
              for (final (i, page) in <Widget>[
                HomeScreen(user: user),
                ReadScreen(level: user.englishLevel),
                const VocabularyScreen(),
                const _ComingSoon(title: 'Perfil', phase: 6, showSignOut: true),
              ].indexed)
                // abas fora da tela não animam (esqueleto pulsando escondido gastaria bateria)
                TickerMode(enabled: i == tab.index, child: page),
            ],
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: tab.index,
            onDestinationSelected: (index) {
              Haptics.select();
              context.read<HomeTabsCubit>().select(HomeTab.values[index]);
            },
            destinations: [
              for (final (value, label, icon, selectedIcon) in _tabs)
                NavigationDestination(
                  label: label,
                  icon: BouncyTabIcon(icon: icon, selected: false),
                  selectedIcon: BouncyTabIcon(icon: selectedIcon, selected: tab == value),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ponytail: abas provisórias até as fases 3 (Ler), 5 (Vocabulário) e 6 (Perfil).
class _ComingSoon extends StatelessWidget {
  const _ComingSoon({required this.title, required this.phase, this.showSignOut = false});

  final String title;
  final int phase;
  final bool showSignOut;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('$title chega na fase $phase.'),
            if (showSignOut)
              TextButton(
                onPressed: () => context.read<AuthBloc>().add(const LogoutRequested()),
                child: const Text('Sair'),
              ),
          ],
        ),
      ),
    );
  }
}
