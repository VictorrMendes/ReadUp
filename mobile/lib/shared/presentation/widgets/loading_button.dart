import 'package:flutter/material.dart';

/// Botão principal com estado de envio: mostra o progresso e não aceita toque duplo.
class LoadingButton extends StatelessWidget {
  const LoadingButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      // o leitor de tela anuncia "ocupado" enquanto envia
      liveRegion: loading,
      child: FilledButton(
        onPressed: loading ? null : onPressed,
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
        child: loading
            ? const SizedBox.square(
                dimension: 22,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
              )
            : Text(label),
      ),
    );
  }
}
