import { API_BASE } from './config';

function getToken(): string | null {
  return localStorage.getItem('token');
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T = unknown>(
  endpoint: string,
  { body, headers: extraHeaders, ...rest }: RequestOptions = {},
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = { ...rest, headers };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, init);

  if (!res.ok) {
    let msg = 'Error en la solicitud';
    try {
      const data = await res.json();
      msg = data.msg || msg;
    } catch {
      /* respuesta no-JSON */
    }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get:    <T = unknown>(endpoint: string, opts?: RequestOptions) =>
            request<T>(endpoint, { ...opts, method: 'GET' }),

  post:   <T = unknown>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
            request<T>(endpoint, { ...opts, method: 'POST', body }),

  put:    <T = unknown>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
            request<T>(endpoint, { ...opts, method: 'PUT', body }),

  patch:  <T = unknown>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
            request<T>(endpoint, { ...opts, method: 'PATCH', body }),

  delete: <T = unknown>(endpoint: string, opts?: RequestOptions) =>
            request<T>(endpoint, { ...opts, method: 'DELETE' }),

  blob:   async (endpoint: string, opts?: RequestOptions): Promise<Blob> => {
            const token = getToken();
            const { body: _, headers: extraHeaders, ...rest } = opts ?? {};
            const headers: Record<string, string> = {
              ...(extraHeaders as Record<string, string>),
            };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}${endpoint}`, {
              ...rest,
              headers,
            });

            if (!res.ok) {
              let msg = 'Error al descargar';
              try {
                const data = await res.json();
                msg = data.msg || msg;
              } catch { /* */ }
              throw new Error(msg);
            }

            return res.blob();
          },
};
