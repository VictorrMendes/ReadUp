// "1000" -> "1.000" (pt-BR), sem depender do Intl do Hermes
export function formatNumber(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
