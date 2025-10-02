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

    it('should extract frontmatter metadata and remove it from content (direct format)', async () => {
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

    it('should extract foam_template metadata when only foam_template frontmatter exists', async () => {
      const templatePath = path.join(testDir, 'template-with-foam-metadata.md');
      const content = `---
foam_template:
  filepath: journal/$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE.md
  name: Daily Note
  description: Template for daily notes
---
# $FOAM_TITLE

Daily content here.`;
      await fs.writeFile(templatePath, content);

      const template = await loader.loadTemplate(URI.file(templatePath));

      // Content should NOT include the foam_template frontmatter
      expect(template.content).toBe('# $FOAM_TITLE\n\nDaily content here.');
      expect(template.content).not.toContain('---');
      expect(template.content).not.toContain('foam_template:');
      expect(template.content).not.toContain('filepath:');

      // Metadata should be extracted from foam_template
      expect(template.metadata.filepath).toBe(
        'journal/$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE.md'
      );
      expect(template.metadata.name).toBe('Daily Note');
      expect(template.metadata.description).toBe('Template for daily notes');
    });

    it('should extract foam_template metadata and preserve other frontmatter', async () => {
      const templatePath = path.join(
        testDir,
        'template-with-mixed-metadata.md'
      );
      const content = `---
foam_template:
  filepath: timeline/$FOAM_DATE_YEAR/$FOAM_DATE_MONTH/$FOAM_DATE_DATE/$FOAM_TITLE-meetingnote-$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE.md
---

---
type: 1on1-meeting
title: "$FOAM_TITLE $FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE"
---

# [[$FOAM_TITLE]] Meeting Notes`;
      await fs.writeFile(templatePath, content);

      const template = await loader.loadTemplate(URI.file(templatePath));

      // Content should NOT include foam_template frontmatter but SHOULD include the note frontmatter
      expect(template.content).toContain('type: 1on1-meeting');
      expect(template.content).toContain('# [[$FOAM_TITLE]] Meeting Notes');
      expect(template.content).not.toContain('foam_template:');

      // Metadata should be extracted from foam_template
      expect(template.metadata.filepath).toBe(
        'timeline/$FOAM_DATE_YEAR/$FOAM_DATE_MONTH/$FOAM_DATE_DATE/$FOAM_TITLE-meetingnote-$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE.md'
      );
    });

    it('should handle foam_template in shared frontmatter block', async () => {
      const templatePath = path.join(testDir, 'template-shared-block.md');
      const content = `---
type: note
foam_template:
  filepath: notes/$FOAM_SLUG.md
  name: Simple Note
tags: example
---

# $FOAM_TITLE`;
      await fs.writeFile(templatePath, content);

      const template = await loader.loadTemplate(URI.file(templatePath));

      // Content should include non-foam frontmatter but not foam_template
      expect(template.content).toContain('type: note');
      expect(template.content).toContain('tags: example');
      expect(template.content).not.toContain('foam_template:');
      expect(template.content).not.toContain('filepath:');

      // Metadata should be extracted from foam_template
      expect(template.metadata.filepath).toBe('notes/$FOAM_SLUG.md');
      expect(template.metadata.name).toBe('Simple Note');
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
