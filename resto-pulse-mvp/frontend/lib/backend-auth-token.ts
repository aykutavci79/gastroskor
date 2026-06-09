let accessToken: string | null = null;

export function setBackendAccessToken(token: string | null) {
  accessToken = token?.trim() ? token.trim() : null;
}

export function getBackendAccessToken() {
  return accessToken;
}

export function backendAuthHeaders(): Record<string, string> {
  const token = getBackendAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
