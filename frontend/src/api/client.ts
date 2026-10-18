import { getUserId } from '../lib/userId';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type QueryParams = Record<string, string | number | undefined>;

/** Every request carries the anonymous user id, so isFavorite is the user's. */
async function request(
  method: 'GET' | 'PUT' | 'DELETE',
  path: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Response> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const url = `/api${path}${query.size > 0 ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method,
    signal,
    headers: { 'X-User-Id': getUserId() },
  });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      `${method} ${url} responded ${response.status}`,
    );
  }
  return response;
}

/** GET /api{path}. Empty and undefined params are left out of the URL. */
export async function apiGet<T>(
  path: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<T> {
  const response = await request('GET', path, params, signal);
  return (await response.json()) as T;
}

/** PUT or DELETE /api{path}, for endpoints that answer 204 No Content. */
export async function apiSend(
  method: 'PUT' | 'DELETE',
  path: string,
): Promise<void> {
  await request(method, path);
}
