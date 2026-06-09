let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token?.trim() ? token.trim() : null;
}

export function getAccessToken() {
  return accessToken;
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
