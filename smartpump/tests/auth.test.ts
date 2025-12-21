import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getToken, hasToken, getAuthHeaders, getGitHubUser, AuthError } from '../src/lib/auth.js';

describe('auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getToken', () => {
    test('returns GITHUB_TOKEN when set', () => {
      process.env.GITHUB_TOKEN = 'ghp_test123';
      expect(getToken()).toBe('ghp_test123');
    });

    test('returns GH_TOKEN when set', () => {
      process.env.GH_TOKEN = 'ghp_test456';
      expect(getToken()).toBe('ghp_test456');
    });

    test('prefers GITHUB_TOKEN over GH_TOKEN', () => {
      process.env.GITHUB_TOKEN = 'ghp_primary';
      process.env.GH_TOKEN = 'ghp_secondary';
      expect(getToken()).toBe('ghp_primary');
    });

    test('throws AuthError when no token set', () => {
      expect(() => getToken()).toThrow(AuthError);
      expect(() => getToken()).toThrow(/GitHub token required/);
    });

    test('AuthError includes help message', () => {
      try {
        getToken();
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AuthError);
        expect((e as AuthError).message).toContain('GITHUB_TOKEN');
        expect((e as AuthError).message).toContain('github.com/settings/tokens');
      }
    });
  });

  describe('hasToken', () => {
    test('returns true when GITHUB_TOKEN set', () => {
      process.env.GITHUB_TOKEN = 'ghp_test';
      expect(hasToken()).toBe(true);
    });

    test('returns true when GH_TOKEN set', () => {
      process.env.GH_TOKEN = 'ghp_test';
      expect(hasToken()).toBe(true);
    });

    test('returns false when no token set', () => {
      expect(hasToken()).toBe(false);
    });

    test('returns false for empty string', () => {
      process.env.GITHUB_TOKEN = '';
      expect(hasToken()).toBe(false);
    });
  });

  describe('getAuthHeaders', () => {
    test('returns Authorization header with Bearer token', () => {
      process.env.GITHUB_TOKEN = 'ghp_mytoken';
      const headers = getAuthHeaders();
      expect(headers).toEqual({
        'Authorization': 'Bearer ghp_mytoken',
      });
    });

    test('throws when no token', () => {
      expect(() => getAuthHeaders()).toThrow(AuthError);
    });
  });

  describe('getGitHubUser', () => {
    const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = mockFetch;
      mockFetch.mockReset();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('returns null when no token', async () => {
      const result = await getGitHubUser();
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('returns user data on success', async () => {
      process.env.GITHUB_TOKEN = 'ghp_valid';

      const mockUser = {
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        id: 12345,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response);

      const result = await getGitHubUser();

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer ghp_valid',
          }),
        })
      );
    });

    test('returns null on API error', async () => {
      process.env.GITHUB_TOKEN = 'ghp_invalid';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const result = await getGitHubUser();
      expect(result).toBeNull();
    });

    test('returns null on network error', async () => {
      process.env.GITHUB_TOKEN = 'ghp_test';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getGitHubUser();
      expect(result).toBeNull();
    });
  });
});
