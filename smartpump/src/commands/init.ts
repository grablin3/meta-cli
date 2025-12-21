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

      // Check if config file already exists
      if (await fs.pathExists(configPath)) {
        if (!options.force) {
          const overwrite = await confirmOverwrite(configPath);
          if (!overwrite) {
            logger.info('Cancelled');
            return;
          }
        }
      }

      logger.section('Grablin Project Setup');

      // Get configuration from user
      const config = await promptForConfig();

      // Save configuration
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
