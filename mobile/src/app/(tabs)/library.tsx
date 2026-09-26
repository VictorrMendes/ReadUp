import { EmptyState } from "@/components/empty-state";

export default function LibraryScreen() {
  return (
    <EmptyState
      icon="library-outline"
      title="Você ainda não possui livros."
      message="Importe seu primeiro PDF para começar."
    />
  );
}
