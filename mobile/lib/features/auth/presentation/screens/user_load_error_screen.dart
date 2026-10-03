import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../blocs/auth_bloc.dart';

/// Token guardado, mas o usuário não carregou (sem rede/servidor fora): tentar de novo ou sair.
class UserLoadErrorScreen extends StatelessWidget {
  const UserLoadErrorScreen({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final bloc = context.read<AuthBloc>();
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(Spaces.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset('assets/images/mascot.png', width: 120, excludeFromSemantics: true),
                const SizedBox(height: Spaces.lg),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: context.textTheme.bodyLarge?.copyWith(color: ReadUpColors.errorText),
                ),
                const SizedBox(height: Spaces.xl),
                FilledButton(
                  onPressed: () => bloc.add(const UserRefreshRequested()),
                  child: const Text('Tentar novamente'),
                ),
                TextButton(
                  onPressed: () => bloc.add(const LogoutRequested()),
                  child: const Text('Sair'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
