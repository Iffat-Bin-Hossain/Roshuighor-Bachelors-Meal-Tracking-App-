const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const TOKEN_KEY = 'rosuighor_token';

export const getAuthToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token: string | null): void => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

/** Error carrying the backend's machine-readable `code` so the UI can show a translated message. */
export class ApiError extends Error {
  code: string;
  status: number;
  data: any;
  constructor(message: string, code: string, status: number, data: any) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

/** Fired when the server says the session is no longer valid (expired, or password changed elsewhere). */
export const SESSION_EXPIRED_EVENT = 'rosuighor:session-expired';

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new ApiError('Network error', 'NETWORK_ERROR', 0, null);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const code = data?.code || (response.status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED');
    if (response.status === 401 && token && code === 'SESSION_EXPIRED') {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(data?.message || 'API request failed', code, response.status, data);
  }
  return data;
};
