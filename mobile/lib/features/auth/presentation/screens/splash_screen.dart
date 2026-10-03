import 'package:flutter/material.dart';

import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';

/// Abertura do app enquanto o token e o usuário carregam (evita piscar a tela de login).
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/images/mascot.png', width: 120, excludeFromSemantics: true),
            const SizedBox(height: Spaces.lg),
            Text(
              'ReadUp',
              style: Theme.of(context).textTheme.headlineLarge
                  ?.copyWith(color: ReadUpColors.primary500),
            ),
          ],
        ),
      ),
    );
  }
}
