#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { NoteCreationEngine } from './note-creation-engine';
import { TemplateLoader } from './utils/template-loader';
import { URI, FileSystem } from './utils/fs';

const program = new Command();

program
  .name('foam')
  .description('CLI for Foam - personal knowledge management tool')
  .version('0.1.0');

program
  .command('create-note')
  .description('Create a new note from a template')
  .option('-t, --title <title>', 'Title of the note')
  .option('-p, --path <path>', 'Path where the note should be created')
  .option(
    '--template <template>',
    'Path to template file (relative to workspace or absolute)'
  )
  .option(
    '-w, --workspace <workspace>',
    'Workspace root directory',
    process.cwd()
  )
  .option(
    '-d, --date <date>',
    'Date to use for FOAM_DATE_* variables (YYYY-MM-DD format)'
  )
  .option('--overwrite', 'Overwrite file if it already exists', false)
  .option(
    '-v, --variable <key=value>',
    'Custom variable (can be specified multiple times)',
    (value, previous: Record<string, string> = {}) => {
      const [key, val] = value.split('=');
      if (!key || val === undefined) {
        throw new Error(
          `Invalid variable format: ${value}. Expected format: key=value`
        );
      }
      previous[key] = val;
      return previous;
    },
    {}
  )
  .action(async options => {
    try {
      // Validate inputs
      if (!options.title && !options.path) {
        console.error(
          'Error: Either --title or --path must be provided'
        );
        process.exit(1);
      }

      const workspaceRoot = path.resolve(options.workspace);

      // Load template
      const templateLoader = new TemplateLoader();
      let template;

      if (options.template) {
        const templatePath = path.isAbsolute(options.template)
          ? options.template
          : path.join(workspaceRoot, options.template);

        const templateUri = URI.file(templatePath);

        if (!(await FileSystem.fileExists(templateUri))) {
          console.error(`Error: Template file not found: ${templatePath}`);
          process.exit(1);
        }

        template = await templateLoader.loadTemplate(templateUri);
      } else {
        template = templateLoader.getDefaultTemplate(options.title);
      }

      // Parse date if provided
      let date: Date | undefined;
      if (options.date) {
        date = new Date(options.date);
        if (isNaN(date.getTime())) {
          console.error(
            `Error: Invalid date format: ${options.date}. Expected YYYY-MM-DD`
          );
          process.exit(1);
        }
      }

      // Create the note
      const engine = new NoteCreationEngine();
      const result = await engine.createNote({
        workspaceRoot,
        notePath: options.path,
        title: options.title,
        template,
        variables: options.variable,
        date,
        overwrite: options.overwrite,
      });

      if (result.created) {
        console.log(`✓ Note created: ${result.filepath}`);
      } else {
        console.log(`✓ Note updated: ${result.filepath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${errorMessage}`);
      process.exit(1);
    }
  });

program.parse();
