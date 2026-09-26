import { EmptyState } from "@/components/empty-state";

export default function VocabularyScreen() {
  return (
    <EmptyState
      icon="language-outline"
      title="Nenhuma palavra salva ainda."
      message="Toque em uma palavra durante a leitura para salvá-la aqui."
    />
  );
}
