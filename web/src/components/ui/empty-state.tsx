import Image from "next/image";
import type { ReactNode } from "react";

type Props = { title: string; message: string; image?: string; action?: ReactNode };

export function EmptyState({ title, message, image = "/mascot.png", action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Image src={image} alt="" width={120} height={120} />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-ink-soft">{message}</p>
      {action}
    </div>
  );
}
