import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../design_system/readup_colors.dart';
import '../../../../design_system/spaces.dart';
import '../../../../shared/presentation/widgets/loading_button.dart';
import '../blocs/auth_bloc.dart';

enum AuthMode { login, register }

/// Cartão branco do login/cadastro: valida no aparelho (campos e senha ≥ 8) e envia ao AuthBloc.
class AuthForm extends StatefulWidget {
  const AuthForm({
    super.key,
    required this.mode,
    required this.minHeight,
    required this.onSwitchMode,
  });

  final AuthMode mode;
  final double minHeight;
  final VoidCallback onSwitchMode;

  @override
  State<AuthForm> createState() => _AuthFormState();
}

class _AuthFormState extends State<AuthForm> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  var _showPassword = false;
  String? _localError;
  // o erro do AuthBloc só vale para um envio feito por este formulário (trocar de modo limpa)
  var _submitted = false;

  bool get _isRegister => widget.mode == AuthMode.register;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    final name = _name.text.trim();
    final email = _email.text.trim();
    final password = _password.text;
    if ((_isRegister && name.isEmpty) || email.isEmpty || password.isEmpty) {
      return setState(() => _localError = 'Preencha todos os campos.');
    }
    if (password.length < 8) {
      return setState(() => _localError = 'A senha deve ter pelo menos 8 caracteres.');
    }
    setState(() {
      _localError = null;
      _submitted = true;
    });
    FocusScope.of(context).unfocus();
    context.read<AuthBloc>().add(
      _isRegister
          ? RegisterRequested(name: name, email: email, password: password)
          : LoginRequested(email: email, password: password),
    );
  }

  @override
  Widget build(BuildContext context) {
    final text = context.textTheme;
    final state = context.watch<AuthBloc>().state;
    final error = _localError ?? (_submitted && state is AuthFailure ? state.message : null);
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: widget.minHeight),
      child: DecoratedBox(
        decoration: const BoxDecoration(
          color: ReadUpColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.sheet)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(Spaces.xl, Spaces.xxl, Spaces.xl, Spaces.xl),
            child: AutofillGroup(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _isRegister ? 'Criar conta' : 'Bem-vindo de volta',
                    style: text.headlineMedium?.copyWith(color: ReadUpColors.primary600),
                  ),
                  const SizedBox(height: Spaces.xs),
                  Text(
                    _isRegister
                        ? 'Comece seu hábito diário de leitura.'
                        : 'Continue sua leitura em inglês.',
                    style: text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary),
                  ),
                  const SizedBox(height: Spaces.xl),
                  if (_isRegister) ...[
                    TextField(
                      controller: _name,
                      decoration: const InputDecoration(labelText: 'Nome'),
                      textCapitalization: TextCapitalization.words,
                      autofillHints: const [AutofillHints.name],
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: Spaces.lg),
                  ],
                  TextField(
                    controller: _email,
                    decoration: const InputDecoration(labelText: 'E-mail'),
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    autofillHints: const [AutofillHints.email],
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: Spaces.lg),
                  TextField(
                    controller: _password,
                    obscureText: !_showPassword,
                    autofillHints: [
                      _isRegister ? AutofillHints.newPassword : AutofillHints.password,
                    ],
                    onSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      labelText: 'Senha',
                      helperText: _isRegister ? 'Mínimo de 8 caracteres' : null,
                      suffixIcon: IconButton(
                        tooltip: _showPassword ? 'Ocultar senha' : 'Mostrar senha',
                        icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                        onPressed: () => setState(() => _showPassword = !_showPassword),
                      ),
                    ),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: Spaces.md),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        error,
                        style: text.bodyMedium?.copyWith(color: ReadUpColors.errorText),
                      ),
                    ),
                  ],
                  const SizedBox(height: Spaces.lg),
                  LoadingButton(
                    label: _isRegister ? 'Criar conta' : 'Entrar',
                    loading: state is AuthInProgress,
                    onPressed: _submit,
                  ),
                  const SizedBox(height: Spaces.lg),
                  TextButton(
                    onPressed: widget.onSwitchMode,
                    child: Text.rich(
                      TextSpan(
                        text: _isRegister ? 'Já tem conta? ' : 'Não tem conta? ',
                        style: text.bodyLarge?.copyWith(color: ReadUpColors.textSecondary),
                        children: [
                          TextSpan(
                            text: _isRegister ? 'Entrar' : 'Criar conta',
                            style: const TextStyle(
                              color: ReadUpColors.primary600,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
