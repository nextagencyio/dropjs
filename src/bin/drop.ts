#!/usr/bin/env node

import { Command } from 'commander';
import { createApp } from '../cli/commands/create-app.js';
import { migrateRun, migrateRollback, migrateStatus, migrateGenerate } from '../cli/commands/migrate.js';
import { migrateDrupalAnalyze, migrateDrupalSchema, migrateDrupalRun } from '../cli/commands/migrate-drupal.js';
import { startDev } from '../cli/commands/dev.js';
import { build } from '../cli/commands/build.js';
import { serve } from '../cli/commands/serve.js';
import { seed } from '../cli/commands/seed.js';
import { dbExport, dbImport } from '../cli/commands/db.js';
import { entityList } from '../cli/commands/entity-list.js';
import { userCreate } from '../cli/commands/user-create.js';

const program = new Command();

program
  .name('drop')
  .description('drop.js CMS framework CLI')
  .version('0.1.0');

program
  .command('init <name>')
  .description('Create a new drop.js project')
  .option('--db <client>', 'Database client (sqlite3, mysql2, pg)', 'sqlite3')
  .action((name, options) => {
    createApp(name, { db: options.db });
  });

program
  .command('dev')
  .description('Start the development server')
  .action(async () => {
    await startDev();
  });

program
  .command('build')
  .description('Compile TypeScript and build admin UI for production')
  .action(async () => {
    await build();
  });

program
  .command('serve')
  .description('Start the production server (serves pre-built admin)')
  .action(async () => {
    await serve();
  });

program
  .command('seed')
  .description('Seed default admin user and sample content')
  .action(async () => {
    await seed();
  });

const migrate = program
  .command('migrate')
  .description('Database migration commands');

migrate
  .command('run')
  .description('Run all pending migrations')
  .option('-d, --directory <path>', 'Migrations directory')
  .action(async (options) => {
    await migrateRun(options.directory);
  });

migrate
  .command('rollback')
  .description('Roll back the last batch of migrations')
  .option('-d, --directory <path>', 'Migrations directory')
  .action(async (options) => {
    await migrateRollback(options.directory);
  });

migrate
  .command('status')
  .description('Show migration status')
  .option('-d, --directory <path>', 'Migrations directory')
  .action(async (options) => {
    await migrateStatus(options.directory);
  });

migrate
  .command('generate <name>')
  .description('Generate a new migration file')
  .action((name) => {
    migrateGenerate(name);
  });

// Drupal migration commands
const migrateDrupal = program
  .command('migrate:drupal')
  .description('Drupal database migration tools');

migrateDrupal
  .command('analyze')
  .description('Analyze a Drupal database and show a report')
  .option('-c, --config <path>', 'Path to migrate.config.js')
  .action(async (options) => {
    await migrateDrupalAnalyze(options.config);
  });

migrateDrupal
  .command('schema')
  .description('Generate drop.js entity type configs from Drupal schema')
  .option('-c, --config <path>', 'Path to migrate.config.js')
  .option('-o, --output <dir>', 'Output directory', 'config/entity_types')
  .action(async (options) => {
    await migrateDrupalSchema(options.config, options.output);
  });

migrateDrupal
  .command('run')
  .description('Migrate content from Drupal to drop.js')
  .option('-c, --config <path>', 'Path to migrate.config.js')
  .option('-t, --type <bundle>', 'Migrate only this content type')
  .action(async (options) => {
    await migrateDrupalRun({ configPath: options.config, type: options.type });
  });

// Database commands
program
  .command('db:export')
  .description('Export database to SQL dump')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    await dbExport(options.output);
  });

program
  .command('db:import')
  .description('Import SQL dump into database')
  .argument('<file>', 'SQL dump file to import')
  .action(async (file) => {
    await dbImport(file);
  });

// Entity commands
program
  .command('entity:list')
  .description('List registered entity types and their fields')
  .action(async () => {
    await entityList();
  });

// User commands
program
  .command('user:create')
  .description('Create a user from the command line')
  .option('-n, --name <name>', 'Username')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password')
  .option('-r, --role <role>', 'Additional role to assign (e.g., admin)')
  .action(async (options) => {
    await userCreate(options);
  });

program.parse();
