#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listSkills } from './commands/list.js';
import { installCommand } from './commands/install.js';
import { updateCommand } from './commands/update.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('tapi-skills')
  .description('Install TAPI integration skills for AI coding assistants')
  .version(packageJson.version);

program
  .command('list')
  .description('List available TAPI skills')
  .action(() => {
    listSkills();
  });

program
  .command('install [skills...]')
  .description('Install TAPI skills to your project')
  .option('--cursor', 'Install to .cursor/rules/')
  .option('--claude', 'Install to .claude/skills/')
  .option('--windsurf', 'Install to .windsurf/rules/')
  .option('--project', 'Install to .tapi/skills/')
  .option('--all', 'Install all available skills')
  .option('--force', 'Overwrite existing files')
  .action((skills: string[], options) => {
    installCommand(skills, options);
  });

program
  .command('update')
  .description('Update installed TAPI skills to latest version')
  .action(() => {
    updateCommand();
  });

program.parse();
