import 'package:flutter/widgets.dart';

import '../../features/reader/presentation/screens/article_screen.dart';
import 'routes_path.dart';

/// Mapa nome → tela para telas empilhadas sobre as abas, por feature. A entrada do app é o
/// AuthGate (sessão), não uma rota.
abstract final class Routes {
  static final Map<String, WidgetBuilder> pages = {
    RoutesPath.article: (context) =>
        ArticleScreen(articleId: ModalRoute.of(context)!.settings.arguments! as int),
  };
}
