export function formatNumber(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatDays(days: number): string {
  return `${formatNumber(days)} ${days === 1 ? "dia" : "dias"}`;
}

/** "Quinta, 1 de outubro" */
export function formatLongDate(date: Date): string {
  const text = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const short = text.replace("-feira", "");
  return short.charAt(0).toUpperCase() + short.slice(1);
}

/** "Ana Maria Souza" → "AS"; "ana" → "A" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0].toUpperCase()).join("");
}
