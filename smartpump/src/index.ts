import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { listCommand } from './commands/list.js';
import { validateCommand } from './commands/validate.js';
import { whoamiCommand } from './commands/whoami.js';

const program = new Command();

program
  .name('grablin')
  .description('CLI for Grablin project scaffolding')
  .version('1.0.0');

// Project commands
program.addCommand(initCommand);
program.addCommand(generateCommand);
program.addCommand(listCommand);
program.addCommand(validateCommand);

// Auth command
program.addCommand(whoamiCommand);

program.parse();
