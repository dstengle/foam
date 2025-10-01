import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TemplateLoader } from '../utils/template-loader';
import { URI } from '../utils/fs';

describe('TemplateLoader', () => {
  let testDir: string;
  let loader: TemplateLoader;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'foam-cli-test-'));
    loader = new TemplateLoader();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('loadTemplate', () => {
    it('should load a simple markdown template', async () => {
      const templatePath = path.join(testDir, 'template.md');
      const content = '# $FOAM_TITLE\n\nThis is a test template.';
      await fs.writeFile(templatePath, content);

      const template = await loader.loadTemplate(URI.file(templatePath));

      expect(template.content).toBe(content);
      expect(template.metadata).toEqual({});
    });

    it('should extract frontmatter metadata and remove it from content', async () => {
      const templatePath = path.join(testDir, 'template-with-metadata.md');
      const content = `---
filepath: journal/$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE.md
name: Daily Note
description: Template for daily notes
---
# $FOAM_TITLE

Daily content here.`;
      await fs.writeFile(templatePath, content);

      const template = await loader.loadTemplate(URI.file(templatePath));

      // Content should NOT include the frontmatter
      expect(template.content).toBe('# $FOAM_TITLE\n\nDaily content here.');
      expect(template.content).not.toContain('---');
      expect(template.content).not.toContain('filepath:');

      // Metadata should be extracted
      expect(template.metadata.filepath).toBe(
        'journal/$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE.md'
      );
      expect(template.metadata.name).toBe('Daily Note');
      expect(template.metadata.description).toBe('Template for daily notes');
    });

    it('should handle templates without frontmatter', async () => {
      const templatePath = path.join(testDir, 'simple-template.md');
      const content = '# Simple Template\n\nNo frontmatter here.';
      await fs.writeFile(templatePath, content);

      const template = await loader.loadTemplate(URI.file(templatePath));

      expect(template.content).toBe(content);
      expect(template.metadata).toEqual({});
    });
  });

  describe('getDefaultTemplate', () => {
    it('should create a default template with title placeholder', () => {
      const template = loader.getDefaultTemplate();

      expect(template.content).toBe('# $FOAM_TITLE\n\n');
      expect(template.metadata).toEqual({});
    });

    it('should create a default template with provided title', () => {
      const template = loader.getDefaultTemplate('My Title');

      expect(template.content).toBe('# My Title\n\n');
      expect(template.metadata).toEqual({});
    });
  });
});
