import 'package:flutter/material.dart';

import '../../design_system/readup_text_styles.dart';

extension ReadUpContext on BuildContext {
  TextTheme get textTheme => Theme.of(this).textTheme;

  /// Estilos do ReadUp fora do TextTheme do Material (leitura, títulos em serifa, números).
  ReadUpTextStyles get readupText => Theme.of(this).extension<ReadUpTextStyles>()!;

  /// "Reduzir movimento" do sistema: animações com significado viram fade/cor, as decorativas param.
  bool get reduceMotion => MediaQuery.disableAnimationsOf(this);
}
