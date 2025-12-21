export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Get GitHub token from environment variable.
 * Throws AuthError if not set.
 */
export function getToken(): string {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new AuthError(
      'GitHub token required. Set GITHUB_TOKEN or GH_TOKEN environment variable.\n' +
      'Create a token at: https://github.com/settings/tokens'
    );
  }
  return token;
}

/**
 * Check if token is available (doesn't throw)
 */
export function hasToken(): boolean {
  return !!(process.env.GITHUB_TOKEN || process.env.GH_TOKEN);
}

/**
 * Get Authorization header for API requests.
 * Throws AuthError if token not set.
 *
 * Note: Uses "Bearer" prefix per GitHub's current OAuth 2.0 standard.
 * See: https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api
 * The legacy "token" prefix also works but "Bearer" is the modern standard.
 */
export function getAuthHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${getToken()}`,
  };
}

/**
 * Get authenticated GitHub user info.
 * Returns null if token invalid or API call fails.
 */
export async function getGitHubUser(): Promise<{
  login: string;
  name?: string;
  email?: string;
  id: number;
} | null> {
  if (!hasToken()) {
    return null;
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        ...getAuthHeaders(),
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) {
      return response.json() as Promise<{
        login: string;
        name?: string;
        email?: string;
        id: number;
      }>;
    }
    return null;
  } catch {
    return null;
  }
}
