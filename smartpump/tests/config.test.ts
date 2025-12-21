import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { validateConfig, loadConfig, saveConfig, getConfigPath } from '../src/lib/config.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('config', () => {
  describe('validateConfig', () => {
    test('validates valid config', () => {
      const config = {
        projectName: 'TestApp',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [
          {
            kind: 'code' as const,
            type: 'react',
            moduleId: 'frontend',
            layers: ['frontend', 'cicd'],
          },
        ],
        environments: ['dev', 'prod'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects missing projectName', () => {
      const config = {
        projectName: '',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('projectName'))).toBe(true);
    });

    test('rejects invalid project name starting with number', () => {
      const config = {
        projectName: '123-invalid',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('projectName'))).toBe(true);
    });

    test('accepts valid project name with hyphens and underscores', () => {
      const config = {
        projectName: 'My_App-Name123',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.errors.filter(e => e.includes('projectName'))).toHaveLength(0);
    });

    test('rejects invalid domain', () => {
      const config = {
        projectName: 'ValidApp',
        domain: 'invalid',
        owner: 'test@example.com',
        modules: [],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('domain'))).toBe(true);
    });

    test('accepts valid domains', () => {
      const validDomains = ['test.com', 'my-app.io', 'example.org'];

      for (const domain of validDomains) {
        const config = {
          projectName: 'ValidApp',
          domain,
          owner: 'test@example.com',
          modules: [],
          environments: ['dev'],
        };

        const result = validateConfig(config);
        expect(result.errors.filter(e => e.includes('domain'))).toHaveLength(0);
      }
    });

    test('rejects invalid email', () => {
      const config = {
        projectName: 'ValidApp',
        domain: 'test.com',
        owner: 'not-an-email',
        modules: [],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('owner'))).toBe(true);
    });

    test('warns when no modules specified', () => {
      const config = {
        projectName: 'ValidApp',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('empty'))).toBe(true);
    });

    test('warns when no code modules', () => {
      const config = {
        projectName: 'ValidApp',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [
          {
            kind: 'extension' as const,
            type: 'auth0',
            moduleId: 'auth0',
          },
        ],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.warnings.some(w => w.includes('code modules'))).toBe(true);
    });

    test('validates module structure - missing kind', () => {
      const config = {
        projectName: 'ValidApp',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [
          {
            type: 'react',
            moduleId: 'frontend',
          } as any,
        ],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('kind'))).toBe(true);
    });

    test('validates module structure - invalid kind', () => {
      const config = {
        projectName: 'ValidApp',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [
          {
            kind: 'invalid' as any,
            type: 'react',
            moduleId: 'frontend',
          },
        ],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('kind'))).toBe(true);
    });

    test('validates module structure - missing type', () => {
      const config = {
        projectName: 'ValidApp',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [
          {
            kind: 'code' as const,
            moduleId: 'frontend',
          } as any,
        ],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('type'))).toBe(true);
    });

    test('validates module structure - invalid moduleId', () => {
      const config = {
        projectName: 'ValidApp',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [
          {
            kind: 'code' as const,
            type: 'react',
            moduleId: 'Invalid_ID',
          },
        ],
        environments: ['dev'],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('moduleId'))).toBe(true);
    });

    test('warns when no environments specified', () => {
      const config = {
        projectName: 'ValidApp',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [],
        environments: undefined as any,
      };

      const result = validateConfig(config);
      expect(result.warnings.some(w => w.includes('environments'))).toBe(true);
    });
  });

  describe('loadConfig / saveConfig', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'grablin-test-'));
    });

    afterEach(async () => {
      await fs.remove(tempDir);
    });

    test('saves and loads config correctly', async () => {
      const config = {
        projectName: 'TestApp',
        domain: 'test.com',
        owner: 'test@example.com',
        modules: [],
        environments: ['dev', 'prod'],
      };

      const configPath = path.join(tempDir, 'grablin.json');
      await saveConfig(config, configPath);

      const loaded = await loadConfig(configPath);

      expect(loaded).not.toBeNull();
      expect(loaded?.projectName).toBe('TestApp');
      expect(loaded?.domain).toBe('test.com');
      expect(loaded?.version).toBe('1.0');
    });

    test('returns null for non-existent file', async () => {
      const result = await loadConfig(path.join(tempDir, 'nonexistent.json'));
      expect(result).toBeNull();
    });

    test('throws on invalid JSON', async () => {
      const configPath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(configPath, 'not valid json {{{');

      await expect(loadConfig(configPath)).rejects.toThrow(/Failed to parse/);
    });
  });

  describe('getConfigPath', () => {
    test('returns provided path', () => {
      expect(getConfigPath('custom.json')).toBe('custom.json');
    });

    test('returns default when undefined', () => {
      expect(getConfigPath()).toBe('grablin.json');
    });
  });
});
