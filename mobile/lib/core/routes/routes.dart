import 'package:flutter/widgets.dart';

/// Mapa nome → tela para telas empilhadas sobre as abas (leitor, livro, revisão), por feature.
/// A entrada do app é o AuthGate (sessão), não uma rota.
abstract final class Routes {
  static final Map<String, WidgetBuilder> pages = {};
}
