import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../design_system/spaces.dart';
import '../../../auth/domain/models/user.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';

// ponytail: Início provisório até a fase 2 (meta, ofensiva, semana, continuar lendo).
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Spaces.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Olá, ${user.name}', style: context.textTheme.headlineLarge),
              const SizedBox(height: Spaces.sm),
              Text('Nível ${user.englishLevel?.code} · meta de ${user.dailyGoal} palavras'),
              const Spacer(),
              OutlinedButton(
                onPressed: () => context.read<AuthBloc>().add(const LogoutRequested()),
                child: const Text('Sair'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
