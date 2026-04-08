export const normalizeOptionalText = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const createEntityId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const getAuthorizationToken = (request: Request) => {
  const authorization = request.headers.get('Authorization');

  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  const sessionToken = request.headers.get('x-session-token');
  return sessionToken?.trim() || null;
};

export const parseJsonValue = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};
