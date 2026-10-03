import 'package:flutter/widgets.dart';

import '../../features/read/presentation/screens/book_screen.dart';
import '../../features/reader/presentation/screens/article_screen.dart';
import '../../features/review/presentation/screens/review_screen.dart';
import 'routes_path.dart';

/// Mapa nome → tela para telas empilhadas sobre as abas, por feature. A entrada do app é o
/// AuthGate (sessão), não uma rota.
abstract final class Routes {
  static final Map<String, WidgetBuilder> pages = {
    RoutesPath.article: (context) =>
        ArticleScreen(articleId: ModalRoute.of(context)!.settings.arguments! as int),
    RoutesPath.review: (_) => const ReviewScreen(),
    RoutesPath.book: (context) =>
        BookScreen(bookId: ModalRoute.of(context)!.settings.arguments! as int),
  };
}
