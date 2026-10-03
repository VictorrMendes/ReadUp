/// Título legível para livros importados antes da limpeza no backend (mesma regra de
/// app/books/router.py::_title): decodifica "%20", "_" vira espaço e, num nome sem espaços,
/// hífens viram espaços ("harry-potter-and-the-stone").
String cleanBookTitle(String raw) {
  var name = raw;
  try {
    name = Uri.decodeComponent(raw);
  } on ArgumentError {
    // "%" solto: mantém como veio
  }
  name = name.replaceAll('_', ' ');
  if (!name.trim().contains(' ') && '-'.allMatches(name).length >= 2) {
    name = name.replaceAll('-', ' ');
  }
  final words = name.split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
  return words.isEmpty ? raw : words.join(' ');
}
