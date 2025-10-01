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
 * Extracts Foam template frontmatter metadata
 */
function extractFrontmatterMetadata(content: string): TemplateMetadata {
  try {
    const parsed = matter(content);
    if (parsed.data && typeof parsed.data === 'object') {
      return parsed.data as TemplateMetadata;
    }
  } catch (error) {
    // Ignore parsing errors
  }
  return {};
}

/**
 * Template loader for CLI - loads markdown templates from filesystem
 */
export class TemplateLoader {
  /**
   * Loads a template from a file path
   */
  async loadTemplate(templatePath: URI): Promise<Template> {
    const content = await FileSystem.readFile(templatePath);
    const metadata = extractFrontmatterMetadata(content);

    return {
      content,
      metadata,
    };
  }

  /**
   * Gets the default template content if no template is specified
   */
  getDefaultTemplate(title?: string): Template {
    const content = title
      ? `# ${title}\n\n`
      : `# $FOAM_TITLE\n\n`;

    return {
      content,
      metadata: {},
    };
  }
}
