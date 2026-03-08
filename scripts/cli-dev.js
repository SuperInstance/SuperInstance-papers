#!/usr/bin/env node
/**
 * Development helper for running the CLI without building
 */

import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const cliPath = resolve(__dirname, '../dist/cli/index.js');

const args = process.argv.slice(2);

const child = spawn('node', [cliPath, ...args], {
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
