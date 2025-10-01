import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { NoteCreationEngine } from '../note-creation-engine';
import { TemplateLoader } from '../utils/template-loader';
import { URI, FileSystem } from '../utils/fs';

describe('NoteCreationEngine', () => {
  let testDir: string;
  let engine: NoteCreationEngine;
  let templateLoader: TemplateLoader;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'foam-cli-test-'));
    engine = new NoteCreationEngine();
    templateLoader = new TemplateLoader();
  });

  afterEach(async () => {
    // Clean up the test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('createNote', () => {
    it('should create a note with title only', async () => {
      const template = templateLoader.getDefaultTemplate('Test Note');

      const result = await engine.createNote({
        workspaceRoot: testDir,
        title: 'Test Note',
        template,
      });

      expect(result.created).toBe(true);
      expect(result.filepath).toContain('Test Note.md');
      expect(result.content).toContain('# Test Note');

      // Verify file was created
      const fileExists = await FileSystem.fileExists(URI.file(result.filepath));
      expect(fileExists).toBe(true);
    });

    it('should create a note with explicit path', async () => {
      const template = templateLoader.getDefaultTemplate('Test Note');
      const notePath = 'notes/my-note.md';

      const result = await engine.createNote({
        workspaceRoot: testDir,
        notePath,
        title: 'Test Note',
        template,
      });

      expect(result.created).toBe(true);
      expect(result.filepath).toContain('notes/my-note.md');
      expect(result.content).toContain('# Test Note');
    });

    it('should resolve FOAM_DATE variables', async () => {
      const template = {
        content: '# Note from $FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE',
        metadata: {},
      };
      const date = new Date('2024-01-15');

      const result = await engine.createNote({
        workspaceRoot: testDir,
        title: 'Date Note',
        template,
        date,
      });

      expect(result.content).toContain('# Note from 2024-01-15');
    });

    it('should resolve custom variables', async () => {
      const template = {
        content:
          '# $FOAM_TITLE\n\nProject: $CUSTOM_PROJECT\nAuthor: $CUSTOM_AUTHOR',
        metadata: {},
      };

      const result = await engine.createNote({
        workspaceRoot: testDir,
        title: 'Custom Note',
        template,
        variables: {
          CUSTOM_PROJECT: 'FoamCLI',
          CUSTOM_AUTHOR: 'John Doe',
        },
      });

      expect(result.content).toContain('# Custom Note');
      expect(result.content).toContain('Project: FoamCLI');
      expect(result.content).toContain('Author: John Doe');
    });

    it('should use template filepath metadata', async () => {
      const template = {
        content: '# $FOAM_TITLE',
        metadata: {
          filepath:
            'journal/$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE.md',
        },
      };
      const date = new Date('2024-01-15');

      const result = await engine.createNote({
        workspaceRoot: testDir,
        title: 'Journal Entry',
        template,
        date,
      });

      expect(result.filepath).toContain('journal/2024-01-15.md');
      expect(result.content).toContain('# Journal Entry');
    });

    it('should sanitize invalid characters in filepath', async () => {
      const template = templateLoader.getDefaultTemplate();

      const result = await engine.createNote({
        workspaceRoot: testDir,
        title: 'Test:Note*With?Invalid|Chars',
        template,
      });

      expect(result.filepath).not.toContain(':');
      expect(result.filepath).not.toContain('*');
      expect(result.filepath).not.toContain('?');
      expect(result.filepath).not.toContain('|');
      expect(result.filepath).toContain('-');
    });

    it('should throw error if file exists and overwrite is false', async () => {
      const template = templateLoader.getDefaultTemplate('Test Note');
      const notePath = 'test-note.md';

      // Create the file first
      await engine.createNote({
        workspaceRoot: testDir,
        notePath,
        title: 'Test Note',
        template,
      });

      // Try to create it again without overwrite
      await expect(
        engine.createNote({
          workspaceRoot: testDir,
          notePath,
          title: 'Test Note',
          template,
          overwrite: false,
        })
      ).rejects.toThrow('File already exists');
    });

    it('should overwrite file when overwrite is true', async () => {
      const template = templateLoader.getDefaultTemplate('First Version');
      const notePath = 'test-note.md';

      // Create the file first
      const firstResult = await engine.createNote({
        workspaceRoot: testDir,
        notePath,
        title: 'First Version',
        template,
      });

      expect(firstResult.content).toContain('# First Version');

      // Overwrite with new content
      const newTemplate = templateLoader.getDefaultTemplate('Second Version');
      const secondResult = await engine.createNote({
        workspaceRoot: testDir,
        notePath,
        title: 'Second Version',
        template: newTemplate,
        overwrite: true,
      });

      expect(secondResult.content).toContain('# Second Version');
      expect(secondResult.created).toBe(true);
    });

    it('should create nested directories as needed', async () => {
      const template = templateLoader.getDefaultTemplate('Deep Note');
      const notePath = 'level1/level2/level3/deep-note.md';

      const result = await engine.createNote({
        workspaceRoot: testDir,
        notePath,
        title: 'Deep Note',
        template,
      });

      expect(result.created).toBe(true);
      expect(result.filepath).toContain('level1/level2/level3/deep-note.md');

      // Verify file exists in nested structure
      const fileExists = await FileSystem.fileExists(URI.file(result.filepath));
      expect(fileExists).toBe(true);
    });

    it('should throw error if neither notePath, template filepath, nor title is provided', async () => {
      const template = {
        content: '# Some content',
        metadata: {},
      };

      await expect(
        engine.createNote({
          workspaceRoot: testDir,
          template,
        })
      ).rejects.toThrow(
        'Either notePath, template filepath metadata, or title must be provided'
      );
    });

    it('should resolve FOAM_TITLE_SAFE variable', async () => {
      const template = {
        content: '# $FOAM_TITLE\n\nSafe: $FOAM_TITLE_SAFE',
        metadata: {},
      };

      const result = await engine.createNote({
        workspaceRoot: testDir,
        title: 'Note: With Special* Chars?',
        template,
      });

      expect(result.content).toContain('# Note: With Special* Chars?');
      expect(result.content).toContain('Safe: Note- With Special- Chars-');
    });

    it('should resolve FOAM_SLUG variable', async () => {
      const template = {
        content: '# $FOAM_TITLE\n\nSlug: $FOAM_SLUG',
        metadata: {},
      };

      const result = await engine.createNote({
        workspaceRoot: testDir,
        title: 'My Test Note Title',
        template,
      });

      expect(result.content).toContain('# My Test Note Title');
      expect(result.content).toContain('Slug: my-test-note-title');
    });
  });
});
