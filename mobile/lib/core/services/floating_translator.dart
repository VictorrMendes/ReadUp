import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../storage/token_storage.dart';

/// Tradução flutuante (só Android): uma bolha sobre os outros apps que traduz o trecho da tela
/// que a pessoa marcar. Mora num serviço nativo; aqui só liga, desliga e cuida da permissão.
abstract interface class FloatingTranslator {
  /// Android: o iOS não permite janelas sobre outros apps.
  bool get supported;

  Future<bool> isRunning();

  /// "Aparecer sobre outros apps", concedida nas configurações do sistema.
  Future<bool> hasPermission();

  Future<void> openPermissionSettings();

  /// Liga a bolha com a sessão atual. false sem permissão, sem sessão ou se o sistema recusar.
  Future<bool> start();

  Future<void> stop();
}

class NativeFloatingTranslator implements FloatingTranslator {
  NativeFloatingTranslator({required this._apiUrl, required this._tokens});

  static const _channel = MethodChannel('readup/float');
  final String _apiUrl;
  final TokenStorage _tokens;

  @override
  bool get supported => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  @override
  Future<bool> isRunning() => _call('isRunning');

  @override
  Future<bool> hasPermission() => _call('hasOverlayPermission');

  @override
  Future<void> openPermissionSettings() => _call('openOverlaySettings');

  @override
  Future<bool> start() async {
    final token = await _tokens.read();
    if (token == null) return false;
    // o token fica só na memória do serviço (some quando a bolha é desligada)
    return _call('start', {'apiUrl': _apiUrl, 'token': token});
  }

  @override
  Future<void> stop() => _call('stop');

  Future<bool> _call(String method, [Map<String, String>? arguments]) async {
    if (!supported) return false;
    try {
      return await _channel.invokeMethod<bool>(method, arguments) ?? false;
    } on PlatformException {
      return false;
    } on MissingPluginException {
      return false;
    }
  }
}
