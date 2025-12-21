import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.log(chalk.red('✗'), msg),
  dim: (msg: string) => console.log(chalk.dim(msg)),

  // For verbose mode
  debug: (msg: string, verbose: boolean) => {
    if (verbose) {
      console.log(chalk.gray('  →'), chalk.gray(msg));
    }
  },

  // Section headers
  section: (title: string) => {
    console.log();
    console.log(chalk.bold(title));
    console.log(chalk.dim('─'.repeat(40)));
  },

  // Key-value pairs
  kv: (key: string, value: string) => {
    console.log(`  ${chalk.dim(key + ':')} ${value}`);
  },

  // List items
  list: (items: string[]) => {
    items.forEach(item => console.log(`  ${chalk.dim('•')} ${item}`));
  },
};
