// "1000" -> "1.000" (pt-BR), sem depender do Intl do Hermes
export function formatNumber(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// "1 dia", "3 dias", "0 dias"
export function formatDays(days: number): string {
  return `${formatNumber(days)} ${days === 1 ? "dia" : "dias"}`;
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// "2026-03-12" -> { name: "Quinta", letter: "Q" }. A data é um dia do calendário (sem hora):
// lida em UTC para o fuso do aparelho não trocar o dia.
export function weekday(isoDate: string): { name: string; letter: string } {
  const [year, month, day] = isoDate.split("-").map(Number);
  const name = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return { name, letter: name[0] };
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// data local do aparelho por extenso: "Terça, 30 de setembro" (sem depender do Intl do Hermes)
export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}
