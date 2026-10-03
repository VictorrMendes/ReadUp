import 'package:flutter/material.dart';

import '../../../../core/core.dart';
import '../../../../design_system/motion.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../widgets/auth_form.dart';

/// Login e cadastro na mesma tela (mesma arte; só o tamanho do topo muda). Sem login social,
/// "esqueci a senha" ou "lembrar de mim" (decisão de produto).
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  var _mode = AuthMode.login;

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final isRegister = _mode == AuthMode.register;
    return Scaffold(
      backgroundColor: ReadUpColors.primary600,
      body: SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: size.height),
          child: Stack(
            children: [
              // arte 390×400, escala pela largura
              Image.asset(
                'assets/images/auth-hero.png',
                width: size.width,
                height: size.width * 400 / 390,
                fit: BoxFit.cover,
                excludeFromSemantics: true,
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _Brand(minHeight: size.height * (isRegister ? 0.26 : 0.38)),
                  AnimatedSwitcher(
                    duration: context.reduceMotion ? Duration.zero : Motion.enter,
                    switchInCurve: MotionCurves.enter,
                    child: AuthForm(
                      key: ValueKey(_mode),
                      mode: _mode,
                      minHeight: size.height * (isRegister ? 0.74 : 0.62),
                      onSwitchMode: () => setState(() {
                        _mode = isRegister ? AuthMode.login : AuthMode.register;
                      }),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand({required this.minHeight});

  final double minHeight;

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: minHeight),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Spaces.xl, Spaces.xl, Spaces.xl, 40),
          child: FractionallySizedBox(
            // zona livre da arte à esquerda
            widthFactor: 0.64,
            alignment: Alignment.bottomLeft,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text('ReadUp', style: text.displaySmall?.copyWith(color: Colors.white)),
                ),
                const SizedBox(height: Spaces.xs),
                Text(
                  'Inglês, uma leitura por dia',
                  style: text.bodyLarge?.copyWith(color: Colors.white),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
