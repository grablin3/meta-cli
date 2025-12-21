import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { generate, listModules } from '../src/lib/generator.js';
import type { GrablinConfig } from '../src/lib/config.js';

describe('generator', () => {
  const originalEnv = process.env;
  const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  const originalFetch = global.fetch;

  const validConfig: GrablinConfig = {
    projectName: 'test-app',
    domain: 'test.com',
    owner: 'test@example.com',
    modules: [
      {
        kind: 'code',
        type: 'react',
        moduleId: 'frontend',
        layers: ['frontend'],
      },
    ],
    environments: ['dev', 'prod'],
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GITHUB_TOKEN = 'ghp_testtoken';
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  describe('generate', () => {
    test('returns error when no token', async () => {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;

      const result = await generate({
        config: validConfig,
        output: '/tmp/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('GitHub token required');
    });

    test('returns error when no output option specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        arrayBuffer: async () => new ArrayBuffer(0),
      } as Response);

      const result = await generate({
        config: validConfig,
        // No output or pushToGithub
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No output option specified');
    });

    test('sends correct payload to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: { fileCount: 10 },
        }),
      } as Response);

      await generate({
        config: validConfig,
        apiUrl: 'https://api.test.com',
        pushToGithub: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ghp_testtoken',
          }),
        })
      );

      // Check payload structure
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.project.name).toBe('test-app');
      expect(body.project.domain).toBe('test.com');
      expect(body.modules).toHaveLength(1);
      expect(body.modules[0].kind).toBe('code');
      expect(body.modules[0].type).toBe('react');
      expect(body.output).toBe('github');
    });

    test('handles API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      const result = await generate({
        config: validConfig,
        pushToGithub: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error (500)');
    });

    test('handles GitHub push success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          data: {
            fileCount: 25,
            repoUrl: 'https://github.com/user/test-app',
            cloneCommand: 'git clone https://github.com/user/test-app.git',
          },
        }),
      } as Response);

      const result = await generate({
        config: validConfig,
        pushToGithub: true,
      });

      expect(result.success).toBe(true);
      expect(result.fileCount).toBe(25);
      expect(result.repoUrl).toBe('https://github.com/user/test-app');
      expect(result.cloneCommand).toContain('git clone');
    });

    test('handles API success: false response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: 'Module not found',
        }),
      } as Response);

      const result = await generate({
        config: validConfig,
        pushToGithub: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Module not found');
    });

    test('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await generate({
        config: validConfig,
        pushToGithub: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    test('uses default API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: { fileCount: 0 } }),
      } as Response);

      await generate({
        config: validConfig,
        pushToGithub: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.grablin.com/api/generate',
        expect.anything()
      );
    });
  });

  describe('listModules', () => {
    test('fetches modules from API', async () => {
      const mockModules = [
        { id: 'code-react', kind: 'code', type: 'react', name: 'React', description: 'React frontend' },
        { id: 'extension-auth0', kind: 'extension', type: 'auth0', name: 'Auth0', description: 'Auth provider' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { modules: mockModules },
        }),
      } as Response);

      const result = await listModules('https://api.test.com');

      expect(result.success).toBe(true);
      expect(result.modules).toEqual(mockModules);
      expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/api/modules');
    });

    test('handles API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response);

      const result = await listModules();

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error (503)');
    });

    test('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      const result = await listModules();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout');
    });

    test('uses default API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { modules: [] } }),
      } as Response);

      await listModules();

      expect(mockFetch).toHaveBeenCalledWith('https://api.grablin.com/api/modules');
    });
  });
});
