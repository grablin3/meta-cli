import fs from 'fs-extra';
import path from 'path';
import type { ProjectConfig, ModuleConfig } from '../utils/prompts.js';

export interface GrablinConfig extends ProjectConfig {
  version?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const DEFAULT_CONFIG_FILE = 'grablin.json';

export async function loadConfig(configPath?: string): Promise<GrablinConfig | null> {
  const filePath = configPath || DEFAULT_CONFIG_FILE;
  const absolutePath = path.resolve(filePath);

  if (!await fs.pathExists(absolutePath)) {
    return null;
  }

  try {
    const content = await fs.readFile(absolutePath, 'utf-8');
    return JSON.parse(content) as GrablinConfig;
  } catch (error) {
    throw new Error(`Failed to parse config file: ${(error as Error).message}`);
  }
}

export async function saveConfig(config: GrablinConfig, configPath?: string): Promise<string> {
  const filePath = configPath || DEFAULT_CONFIG_FILE;
  const absolutePath = path.resolve(filePath);

  // Add version if not present
  const configWithVersion: GrablinConfig = {
    version: '1.0',
    ...config,
  };

  await fs.writeFile(absolutePath, JSON.stringify(configWithVersion, null, 2) + '\n');
  return absolutePath;
}

export function validateConfig(config: GrablinConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config.projectName) {
    errors.push('projectName is required');
  } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(config.projectName)) {
    errors.push('projectName must start with a letter and contain only letters, numbers, hyphens, and underscores');
  }

  if (!config.domain) {
    errors.push('domain is required');
  } else if (!/^[a-z0-9][a-z0-9-]*\.[a-z]{2,}$/.test(config.domain)) {
    errors.push('domain must be a valid domain name (e.g., myapp.com)');
  }

  if (!config.owner) {
    errors.push('owner email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.owner)) {
    errors.push('owner must be a valid email address');
  }

  if (!config.modules || !Array.isArray(config.modules)) {
    errors.push('modules array is required');
  } else if (config.modules.length === 0) {
    warnings.push('No modules specified - project will be empty');
  } else {
    // Validate each module
    config.modules.forEach((module, index) => {
      const moduleErrors = validateModule(module, index);
      errors.push(...moduleErrors);
    });

    // Check for code modules
    const codeModules = config.modules.filter(m => m.kind === 'code');
    if (codeModules.length === 0) {
      warnings.push('No code modules (frontend/backend) specified');
    }
  }

  // Validate environments
  if (!config.environments || !Array.isArray(config.environments)) {
    warnings.push('No environments specified, using defaults (dev, staging, prod)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateModule(module: ModuleConfig, index: number): string[] {
  const errors: string[] = [];
  const prefix = `modules[${index}]`;

  if (!module.kind) {
    errors.push(`${prefix}.kind is required (code, extension, provider, vcs)`);
  } else if (!['code', 'extension', 'provider', 'vcs'].includes(module.kind)) {
    errors.push(`${prefix}.kind must be one of: code, extension, provider, vcs`);
  }

  if (!module.type) {
    errors.push(`${prefix}.type is required`);
  }

  if (!module.moduleId) {
    errors.push(`${prefix}.moduleId is required`);
  } else if (!/^[a-z][a-z0-9-]*$/.test(module.moduleId)) {
    errors.push(`${prefix}.moduleId must be lowercase with hyphens only`);
  }

  return errors;
}

export function getConfigPath(configOption?: string): string {
  return configOption || DEFAULT_CONFIG_FILE;
}
