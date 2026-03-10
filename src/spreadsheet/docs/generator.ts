#!/usr/bin/env node

/**
 * POLLN API Documentation Generator CLI
 * Command-line tool for generating API documentation
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { createDocumentationGenerator, type DocConfig } from './index.js';

const program = new Command();

program
  .name('polln-docs')
  .description('Generate API documentation for POLLN Spreadsheet API')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate API documentation')
  .option('-o, --output <dir>', 'Output directory', './docs/api')
  .option('-t, --title <title>', 'API title', 'POLLN Spreadsheet API')
  .option('-v, --version <version>', 'API version', '1.0.0')
  .option('-d, --description <desc>', 'API description')
  .option('-s, --servers <urls...>', 'API server URLs')
  .option('--format <format...>', 'Output formats', ['json', 'yaml', 'markdown', 'html'])
  .action(async (options) => {
    try {
      console.log('🚀 Generating API documentation...');

      const config: Partial<DocConfig> = {
        title: options.title,
        version: options.version,
        description: options.description || 'API for living spreadsheet cells with sensation, memory, and agency',
        servers: options.servers?.map(url => ({ url, description: '' })) || [
          { url: 'https://api.polln.ai', description: 'Production server' },
          { url: 'http://localhost:8080', description: 'Development server' },
        ],
        tags: [
          { name: 'Cells', description: 'Living cell operations' },
          { name: 'Spreadsheets', description: 'Spreadsheet management' },
          { name: 'Colonies', description: 'Colony operations' },
          { name: 'WebSocket', description: 'Real-time events' },
        ],
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT bearer token authentication',
          },
        },
      };

      const generator = createDocumentationGenerator(config);

      // Ensure output directory exists
      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }

      // Generate documentation
      await generator.exportToDirectory(options.output);

      console.log('✅ Documentation generated successfully!');
      console.log(`📁 Output directory: ${path.resolve(options.output)}`);
      console.log('');
      console.log('Generated files:');
      console.log(`  - ${path.join(options.output, 'openapi.json')}`);
      console.log(`  - ${path.join(options.output, 'openapi.yaml')}`);
      console.log(`  - ${path.join(options.output, 'asyncapi.json')}`);
      console.log(`  - ${path.join(options.output, 'asyncapi.yaml')}`);
      console.log(`  - ${path.join(options.output, 'README.md')}`);
      console.log(`  - ${path.join(options.output, 'index.html')}`);
    } catch (error) {
      console.error('❌ Error generating documentation:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate OpenAPI specification')
  .option('-f, --file <path>', 'Path to OpenAPI spec file', './openapi.json')
  .action((options) => {
    try {
      console.log(`🔍 Validating ${options.file}...`);

      if (!fs.existsSync(options.file)) {
        console.error(`❌ File not found: ${options.file}`);
        process.exit(1);
      }

      const spec = JSON.parse(fs.readFileSync(options.file, 'utf-8'));

      // Basic validation
      if (!spec.openapi) {
        console.error('❌ Missing "openapi" field');
        process.exit(1);
      }

      if (!spec.info) {
        console.error('❌ Missing "info" field');
        process.exit(1);
      }

      if (!spec.info.title || !spec.info.version) {
        console.error('❌ Missing required fields in "info"');
        process.exit(1);
      }

      if (!spec.paths || Object.keys(spec.paths).length === 0) {
        console.warn('⚠️  No paths defined in the specification');
      }

      console.log('✅ OpenAPI specification is valid!');
      console.log(`   Version: ${spec.openapi}`);
      console.log(`   Title: ${spec.info.title}`);
      console.log(`   Version: ${spec.info.version}`);
      console.log(`   Paths: ${Object.keys(spec.paths || {}).length}`);
    } catch (error) {
      console.error('❌ Error validating specification:', error);
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Start a local documentation server')
  .option('-p, --port <port>', 'Port number', '8080')
  .option('-d, --dir <dir>', 'Documentation directory', './docs/api')
  .option('-o, --open', 'Open browser automatically', false)
  .action(async (options) => {
    try {
      const { createServer } = await import('http');

      const server = createServer((req, res) => {
        let filePath = '.' + (req.url === '/' ? '/index.html' : req.url);
        filePath = path.join(options.dir, filePath);

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.yaml': 'text/yaml',
          '.yml': 'text/yaml',
        };

        const contentType = (mimeTypes as any)[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
          if (error) {
            if (error.code === 'ENOENT') {
              res.writeHead(404, { 'Content-Type': 'text/html' });
              res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
              res.writeHead(500);
              res.end(`Server Error: ${error.code}`, 'utf-8');
            }
          } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
          }
        });
      });

      server.listen(options.port, () => {
        console.log('📚 Documentation server started!');
        console.log(`   URL: http://localhost:${options.port}`);
        console.log(`   Directory: ${path.resolve(options.dir)}`);
        console.log('');
        console.log('Press Ctrl+C to stop the server');

        if (options.open) {
          const { exec } = require('child_process');
          const url = `http://localhost:${options.port}`;
          const command = process.platform === 'darwin' ? 'open' :
                         process.platform === 'win32' ? 'start' : 'xdg-open';
          exec(`${command} ${url}`);
        }
      });
    } catch (error) {
      console.error('❌ Error starting server:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize documentation configuration')
  .option('-o, --output <file>', 'Config file path', './polln.docs.config.json')
  .action((options) => {
    const config = {
      title: 'POLLN Spreadsheet API',
      version: '1.0.0',
      description: 'API for living spreadsheet cells with sensation, memory, and agency',
      servers: [
        { url: 'https://api.polln.ai', description: 'Production server' },
        { url: 'http://localhost:8080', description: 'Development server' },
      ],
      tags: [
        { name: 'Cells', description: 'Living cell operations' },
        { name: 'Spreadsheets', description: 'Spreadsheet management' },
        { name: 'Colonies', description: 'Colony operations' },
        { name: 'WebSocket', description: 'Real-time events' },
      ],
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT bearer token authentication',
        },
      },
    };

    fs.writeFileSync(options.output, JSON.stringify(config, null, 2));
    console.log('✅ Configuration file created:', options.output);
    console.log('');
    console.log('Edit the configuration file and run:');
    console.log('  polln-docs generate --config ' + options.output);
  });

program.parse();
