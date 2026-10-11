const API_BASE = 'http://localhost:5000/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('rosuighor_token');
};

export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('rosuighor_token', token);
  } else {
    localStorage.removeItem('rosuighor_token');
  }
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data;
};
