import matter from 'gray-matter';
import { URI, FileSystem } from './fs';

export interface TemplateMetadata {
  filepath?: string;
  name?: string;
  description?: string;
  [key: string]: any;
}

export interface Template {
  content: string;
  metadata: TemplateMetadata;
}

/**
 * Extracts Foam template frontmatter metadata and content
 */
function parseFrontmatter(rawContent: string): {
  metadata: TemplateMetadata;
  content: string;
} {
  try {
    const parsed = matter(rawContent);
    return {
      metadata: (parsed.data || {}) as TemplateMetadata,
      content: parsed.content,
    };
  } catch (error) {
    // If parsing fails, return raw content with no metadata
    return {
      metadata: {},
      content: rawContent,
    };
  }
}

/**
 * Template loader for CLI - loads markdown templates from filesystem
 */
export class TemplateLoader {
  /**
   * Loads a template from a file path
   */
  async loadTemplate(templatePath: URI): Promise<Template> {
    const rawContent = await FileSystem.readFile(templatePath);
    const { metadata, content } = parseFrontmatter(rawContent);

    return {
      content,
      metadata,
    };
  }

  /**
   * Gets the default template content if no template is specified
   */
  getDefaultTemplate(title?: string): Template {
    const content = title ? `# ${title}\n\n` : `# $FOAM_TITLE\n\n`;

    return {
      content,
      metadata: {},
    };
  }
}
