import { Command } from 'commander';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { loadConfig, validateConfig, getConfigPath } from '../lib/config.js';
import { generate } from '../lib/generator.js';

const DEFAULT_API_URL = process.env.GRABLIN_API_URL || 'https://api.grablin.com';

export const generateCommand = new Command('generate')
  .description('Generate project from configuration')
  .option('-c, --config <file>', 'Config file path', 'grablin.json')
  .option('-o, --output <dir>', 'Download and extract to local directory')
  .option('--push-to-github', 'Push generated project to GitHub')
  .option('--repo <name>', 'GitHub repository name (default: project name)')
  .option('--private', 'Make GitHub repository private')
  .option('--api <url>', 'API URL', DEFAULT_API_URL)
  .option('-v, --verbose', 'Verbose output')
  .option('-q, --quiet', 'Suppress output')
  .action(async (options) => {
    const spinner = ora();

    try {
      // Validate options
      if (!options.output && !options.pushToGithub) {
        logger.error('Must specify either --output <dir> or --push-to-github');
        process.exit(1);
      }

      // Load configuration
      const configPath = getConfigPath(options.config);
      spinner.start(`Loading configuration from ${configPath}`);

      const config = await loadConfig(configPath);
      if (!config) {
        spinner.fail(`Config file not found: ${configPath}`);
        logger.info('Run "grablin init" to create a configuration file');
        process.exit(1);
      }
      spinner.succeed('Configuration loaded');

      // Validate configuration
      spinner.start('Validating configuration');
      const validation = validateConfig(config);

      if (validation.warnings.length > 0 && !options.quiet) {
        spinner.warn('Configuration has warnings:');
        validation.warnings.forEach(w => logger.warn(`  ${w}`));
      }

      if (!validation.valid) {
        spinner.fail('Configuration is invalid:');
        validation.errors.forEach(e => logger.error(`  ${e}`));
        process.exit(1);
      }

      if (validation.warnings.length === 0) {
        spinner.succeed('Configuration valid');
      }

      // Show generation settings
      if (!options.quiet) {
        logger.section('Generation Settings');
        logger.kv('Project', config.projectName);
        logger.kv('Domain', config.domain);
        logger.kv('API', options.api);
        if (options.output) {
          logger.kv('Output', options.output);
        }
        if (options.pushToGithub) {
          logger.kv('GitHub', options.repo || config.projectName.toLowerCase());
          logger.kv('Private', options.private ? 'Yes' : 'No');
        }
        console.log();
      }

      // Generate project
      spinner.start('Generating project via Grablin API');

      const result = await generate({
        config,
        apiUrl: options.api,
        output: options.output,
        pushToGithub: options.pushToGithub,
        repoName: options.repo,
        private: options.private,
        verbose: options.verbose,
      });

      if (!result.success) {
        spinner.fail('Generation failed');
        logger.error(result.error || 'Unknown error');
        process.exit(1);
      }

      spinner.succeed('Project generated successfully');

      // Success message based on output type
      console.log();
      if (result.repoUrl) {
        logger.success(`Repository created: ${result.repoUrl}`);
        console.log();
        logger.info('Clone your project:');
        logger.dim(`  ${result.cloneCommand || `git clone ${result.repoUrl}`}`);
      } else if (result.outputPath) {
        logger.success(`Project extracted to: ${result.outputPath}`);
        console.log();
        logger.info('Next steps:');
        logger.list([
          `cd ${result.outputPath}`,
          'Review generated files',
          'Follow README.md for setup',
        ]);
      }
    } catch (error) {
      spinner.fail('Error');
      logger.error((error as Error).message);
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });
