import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { loadConfig, validateConfig, getConfigPath } from '../lib/config.js';

export const validateCommand = new Command('validate')
  .description('Validate project configuration')
  .option('-c, --config <file>', 'Config file path', 'grablin.json')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const configPath = getConfigPath(options.config);

      // Load configuration
      const config = await loadConfig(configPath);
      if (!config) {
        if (options.json) {
          console.log(JSON.stringify({ valid: false, error: 'Config file not found' }));
        } else {
          logger.error(`Config file not found: ${configPath}`);
          logger.info('Run "grablin init" to create a configuration file');
        }
        process.exit(1);
      }

      // Validate configuration
      const result = validateConfig(config);

      if (options.json) {
        console.log(JSON.stringify({
          valid: result.valid,
          errors: result.errors,
          warnings: result.warnings,
          config: {
            projectName: config.projectName,
            domain: config.domain,
            moduleCount: config.modules?.length || 0,
          },
        }, null, 2));
        return;
      }

      // Display results
      logger.section('Configuration Validation');
      console.log();

      logger.kv('File', configPath);
      logger.kv('Project', config.projectName || chalk.dim('(not set)'));
      logger.kv('Domain', config.domain || chalk.dim('(not set)'));
      logger.kv('Modules', String(config.modules?.length || 0));

      console.log();

      if (result.errors.length > 0) {
        console.log(chalk.red.bold('Errors:'));
        result.errors.forEach(e => console.log(`  ${chalk.red('✗')} ${e}`));
        console.log();
      }

      if (result.warnings.length > 0) {
        console.log(chalk.yellow.bold('Warnings:'));
        result.warnings.forEach(w => console.log(`  ${chalk.yellow('⚠')} ${w}`));
        console.log();
      }

      if (result.valid) {
        logger.success('Configuration is valid');
        if (result.warnings.length === 0) {
          console.log();
          logger.info('Ready to generate. Run: grablin generate');
        }
      } else {
        logger.error('Configuration is invalid');
        process.exit(1);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ valid: false, error: (error as Error).message }));
      } else {
        logger.error((error as Error).message);
      }
      process.exit(1);
    }
  });
