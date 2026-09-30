import { EmptyState } from "@/components/empty-state";

export default function LibraryScreen() {
  // ação "Importar PDF" entra na etapa 17
  return (
    <EmptyState
      icon="library-outline"
      illustration={require("@/assets/images/empty-library.png")}
      title="Você ainda não possui livros"
      message="Importe seu primeiro PDF para começar."
    />
  );
}
