import 'package:file_picker/file_picker.dart';

/// Escolhe um PDF no aparelho; devolve o caminho do arquivo ou null se a pessoa cancelar.
/// Função injetável: os testes trocam pelo arquivo que quiserem.
typedef PdfPicker = Future<String?> Function();

Future<String?> pickPdfFromDevice() async {
  final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
  return files.isEmpty ? null : files.first.path;
}
