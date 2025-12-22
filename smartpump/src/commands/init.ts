import { Command } from 'commander';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import { promptForConfig, confirmOverwrite } from '../utils/prompts.js';
import { saveConfig, getConfigPath } from '../lib/config.js';

export const initCommand = new Command('init')
  .description('Initialize a new project configuration')
  .option('-c, --config <file>', 'Config file path', 'grablin.json')
  .option('-f, --force', 'Overwrite existing config file')
  .option('-y, --yes', 'Skip confirmation prompts (use defaults)')
  .action(async (options) => {
    try {
      const configPath = getConfigPath(options.config);

      // M40: Atomic file check and user confirmation to prevent TOCTOU
      // Read existing file content if present (atomic operation)
      let existingContent: string | null = null;
      try {
        existingContent = await fs.readFile(configPath, 'utf-8');
      } catch (error: any) {
        // File doesn't exist or can't be read - that's OK
        if (error.code !== 'ENOENT') {
          throw new Error(`Cannot access config file: ${error.message}`);
        }
      }

      // If file exists and not forced, confirm overwrite
      if (existingContent !== null && !options.force) {
        const overwrite = await confirmOverwrite(configPath);
        if (!overwrite) {
          logger.info('Cancelled');
          return;
        }
      }

      logger.section('Grablin Project Setup');

      // Get configuration from user
      const config = await promptForConfig();

      // M40: Save configuration (writeFile is atomic on most filesystems)
      const savedPath = await saveConfig(config, configPath);

      console.log();
      logger.success(`Created ${savedPath}`);
      console.log();
      logger.info('Next steps:');
      logger.list([
        'Review and edit grablin.json as needed',
        'Run: grablin generate',
      ]);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
