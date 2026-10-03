import 'package:flutter/material.dart';

// ponytail: leitor provisório até a fase 4 (palavras tocáveis, painel, sessão de progresso).
class ArticleScreen extends StatelessWidget {
  const ArticleScreen({super.key, required this.articleId});

  final int articleId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leitor')),
      body: Center(child: Text('Texto $articleId — o leitor chega na fase 4.')),
    );
  }
}
