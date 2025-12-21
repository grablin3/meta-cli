import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { hasToken, getGitHubUser } from '../lib/auth.js';

export const whoamiCommand = new Command('whoami')
  .description('Show current authenticated user')
  .action(async () => {
    if (!hasToken()) {
      console.log();
      logger.info('Not authenticated.');
      console.log();
      logger.section('Setup');
      console.log('  Set GITHUB_TOKEN or GH_TOKEN environment variable:');
      console.log();
      console.log('    export GITHUB_TOKEN=ghp_xxxx');
      console.log();
      console.log('  Create a token at: https://github.com/settings/tokens');
      console.log();
      return;
    }

    const spinner = ora('Fetching user info').start();

    try {
      const user = await getGitHubUser();
      spinner.stop();

      if (!user) {
        logger.error('Invalid or expired token.');
        process.exit(1);
      }

      console.log();
      logger.section('Authenticated User');
      logger.kv('Username', chalk.cyan(user.login));
      if (user.name) {
        logger.kv('Name', user.name);
      }
      if (user.email) {
        logger.kv('Email', user.email);
      }
      logger.kv('User ID', String(user.id));
      console.log();
    } catch (error) {
      spinner.fail('Failed to fetch user info');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
