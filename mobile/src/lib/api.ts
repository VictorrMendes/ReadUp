export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown; token?: string };

// servidor fora do ar ou rede ruim não podem deixar a tela carregando para sempre;
// upload de PDF (processado na hora pelo backend) tem mais folga
export const TIMEOUT_MS = 20_000;
export const UPLOAD_TIMEOUT_MS = 120_000;
export const TIMEOUT_MESSAGE = "O servidor demorou para responder. Verifique sua conexão e tente de novo.";

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL não definida. Copie mobile/.env.example para mobile/.env.");
  }
  const { body, token, headers, ...init } = options;
  // multipart: o fetch monta o Content-Type com o boundary; JSON nos demais casos
  const form = body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), form ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !form && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
  } catch (e) {
    // status 0: não houve resposta do servidor (as telas mostram o detail)
    if (controller.signal.aborted) throw new ApiError(0, TIMEOUT_MESSAGE);
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail =
      typeof data?.detail === "string" ? data.detail : "Erro inesperado. Tente novamente.";
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T; // sem corpo (ex.: DELETE)
  return (await response.json()) as T;
}
