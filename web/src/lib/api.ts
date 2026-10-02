// Cliente das chamadas do app: tudo passa pela ponte /api/* do Next (o cookie de sessão vai junto).

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...init } = options;
  const form = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body !== undefined && !form && { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : form ? (body as FormData) : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail =
      typeof data?.detail === "string" ? data.detail : "Erro inesperado. Tente novamente.";
    // sessão inválida: volta ao login (o cookie já foi apagado pela ponte)
    if (response.status === 401 && typeof window !== "undefined") {
      // recarga completa de propósito: zera o estado e o cache da sessão anterior
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function errorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  return error instanceof ApiError ? error.detail : fallback;
}
