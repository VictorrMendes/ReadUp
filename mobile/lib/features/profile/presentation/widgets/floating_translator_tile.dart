import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/core.dart';
import '../../../../core/services/floating_translator.dart';
import '../cubits/floating_translator_cubit.dart';

/// Liga e desliga a bolha de tradução. Só aparece onde ela existe (Android).
class FloatingTranslatorTile extends StatelessWidget {
  const FloatingTranslatorTile({super.key});

  @override
  Widget build(BuildContext context) {
    final translator = context.read<FloatingTranslator>();
    if (!translator.supported) return const SizedBox.shrink();
    return BlocProvider(
      create: (_) => FloatingTranslatorCubit(translator: translator)..load(),
      child: const _Tile(),
    );
  }
}

class _Tile extends StatefulWidget {
  const _Tile();

  @override
  State<_Tile> createState() => _TileState();
}

class _TileState extends State<_Tile> {
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    // volta das configurações do sistema (permissão) ou a bolha foi desligada pela notificação
    _lifecycle = AppLifecycleListener(
      onResume: () => unawaited(context.read<FloatingTranslatorCubit>().resumed()),
    );
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  Future<void> _askPermission(BuildContext context) async {
    final cubit = context.read<FloatingTranslatorCubit>();
    final open = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Permitir a bolha'),
        content: const Text(
          'Para a bolha aparecer sobre mangás, HQs e sites, o Android pede a permissão '
          '"Aparecer sobre outros apps". Ative o ReadUp na próxima tela e volte para cá.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Agora não'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Abrir configurações'),
          ),
        ],
      ),
    );
    await cubit.permissionAnswered(openSettings: open ?? false);
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<FloatingTranslatorCubit, FloatingTranslatorState>(
      listenWhen: (previous, current) =>
          (!previous.askPermission && current.askPermission) ||
          (!previous.failed && current.failed),
      listener: (context, state) {
        if (state.askPermission) {
          unawaited(_askPermission(context));
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Não deu para ligar a bolha. Tente de novo.')),
          );
          context.read<FloatingTranslatorCubit>().failureShown();
        }
      },
      builder: (context, state) => Card(
        child: SwitchListTile(
          value: state.on,
          onChanged: state.busy
              ? null
              : (on) {
                  Haptics.select();
                  unawaited(context.read<FloatingTranslatorCubit>().toggle(on));
                },
          title: const Text('Tradução flutuante'),
          subtitle: const Text(
            'Uma bolha sobre outros apps traduz o trecho que você marcar em mangás, HQs e '
            'sites. Não conta para a meta.',
          ),
        ),
      ),
    );
  }
}
