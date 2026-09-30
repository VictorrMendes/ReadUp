// "1000" -> "1.000" (pt-BR), sem depender do Intl do Hermes
export function formatNumber(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// "1 dia", "3 dias", "0 dias"
export function formatDays(days: number): string {
  return `${formatNumber(days)} ${days === 1 ? "dia" : "dias"}`;
}
