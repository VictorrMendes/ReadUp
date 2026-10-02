// Regras puras da ponte /api/* → FastAPI (testáveis sem servidor).

// só os recursos que o app usa; /auth fica de fora (login e cadastro passam por /api/session)
const ALLOWED_ROOTS = new Set([
  "users",
  "articles",
  "reading",
  "goals",
  "stats",
  "vocabulary",
  "books",
  "achievements",
]);

/** Caminho seguro para repassar à API, ou null. Barra "..", segmentos vazios e raízes fora da lista. */
export function backendPath(segments: string[]): string | null {
  if (segments.length === 0 || !ALLOWED_ROOTS.has(segments[0])) return null;
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || /[\\/?#]/.test(segment)) return null;
  }
  return "/" + segments.map(encodeURIComponent).join("/");
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Métodos que mudam dados só aceitam chamadas da própria origem (proteção contra CSRF, além do
 * cookie SameSite=Lax). */
export function sameOriginAllowed(method: string, origin: string | null, host: string | null) {
  if (!UNSAFE.has(method.toUpperCase())) return true;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
