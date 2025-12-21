import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { listModules } from '../lib/generator.js';

const DEFAULT_API_URL = process.env.GRABLIN_API_URL || 'https://api.grablin.com';

interface ModuleInfo {
  id: string;
  type: string;
  name: string;
  description: string;
  kind: string;
  layers: string[];
}

export const listCommand = new Command('list')
  .description('List available modules and extensions')
  .argument('[type]', 'Type to list: modules, extensions, providers, vcs (default: all)')
  .option('--api <url>', 'API URL', DEFAULT_API_URL)
  .option('--json', 'Output as JSON')
  .action(async (type, options) => {
    const spinner = ora();

    try {
      spinner.start('Fetching available modules');

      const result = await listModules(options.api);

      if (!result.success) {
        spinner.fail('Failed to fetch modules');
        logger.error(result.error || 'Unknown error');
        process.exit(1);
      }

      spinner.stop();

      const modules = result.modules || [];

      if (options.json) {
        console.log(JSON.stringify(modules, null, 2));
        return;
      }

      // Filter by type if specified
      const filterKind = type ? mapTypeToKind(type) : null;
      const filtered = filterKind
        ? modules.filter(m => m.kind === filterKind)
        : modules;

      if (filtered.length === 0) {
        logger.warn(`No ${type || 'modules'} found`);
        return;
      }

      // Group by kind
      const grouped = groupByKind(filtered);

      for (const [kind, items] of Object.entries(grouped)) {
        logger.section(formatKindTitle(kind));

        for (const module of items) {
          console.log();
          console.log(`  ${chalk.bold(module.id)} ${chalk.dim(`(${module.type})`)}`);
          console.log(`    ${module.description || 'No description'}`);
          if (module.layers && module.layers.length > 0) {
            console.log(`    ${chalk.dim('Layers:')} ${module.layers.join(', ')}`);
          }
        }
      }

      console.log();
    } catch (error) {
      spinner.fail('Error');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

function mapTypeToKind(type: string): string | null {
  const mapping: Record<string, string> = {
    modules: 'code',
    code: 'code',
    extensions: 'extension',
    extension: 'extension',
    providers: 'provider',
    provider: 'provider',
    vcs: 'vcs',
  };
  return mapping[type.toLowerCase()] || null;
}

function groupByKind(modules: ModuleInfo[]): Record<string, ModuleInfo[]> {
  const groups: Record<string, ModuleInfo[]> = {};

  for (const module of modules) {
    const kind = module.kind || 'unknown';
    if (!groups[kind]) {
      groups[kind] = [];
    }
    groups[kind].push(module);
  }

  // Sort by priority
  const priority = ['code', 'extension', 'provider', 'vcs', 'unknown'];
  const sorted: Record<string, ModuleInfo[]> = {};

  for (const kind of priority) {
    if (groups[kind]) {
      sorted[kind] = groups[kind];
    }
  }

  return sorted;
}

function formatKindTitle(kind: string): string {
  const titles: Record<string, string> = {
    code: 'Code Modules (Frontend/Backend)',
    extension: 'Extensions',
    provider: 'Cloud Providers',
    vcs: 'Version Control',
    unknown: 'Other',
  };
  return titles[kind] || kind;
}
