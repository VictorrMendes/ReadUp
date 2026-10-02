import { cn } from "./cn";

// Bloco de carregamento com um brilho que atravessa (sinal de "está vindo"); com "reduzir
// movimento" fica parado (a animação zera em globals.css).
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-muted bg-[length:200%_100%] animate-[shimmer_1.3s_ease-in-out_infinite]",
        "bg-[linear-gradient(90deg,transparent_25%,rgb(255_255_255/0.45)_50%,transparent_75%)]",
        className,
      )}
      aria-hidden
    />
  );
}
