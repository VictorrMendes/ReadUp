import 'package:flutter_bloc/flutter_bloc.dart';

enum HomeTab { home, read, vocabulary, profile }

/// Aba ativa (outras telas pedem troca: "Ver textos" no Início leva à aba Ler).
class HomeTabsCubit extends Cubit<HomeTab> {
  HomeTabsCubit() : super(HomeTab.home);

  void select(HomeTab tab) => emit(tab);
}
