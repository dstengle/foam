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
 * Supports both foam_template nested format and direct format for backwards compatibility
 */
function parseFrontmatter(rawContent: string): {
  metadata: TemplateMetadata;
  content: string;
} {
  try {
    // Pass empty options to bust cache (see gray-matter issue #124)
    const parsed = matter(rawContent, {});

    // Check if frontmatter is YAML (only YAML is supported)
    if (parsed.language !== 'yaml' && parsed.matter !== '') {
      return {
        metadata: {},
        content: rawContent,
      };
    }

    const frontmatter = parsed.data;
    const foamMetadata = frontmatter['foam_template'];

    // If foam_template key exists and is an object, use it
    if (typeof foamMetadata === 'object' && foamMetadata !== null) {
      const frontmatterKeys = Object.keys(frontmatter);
      const onlyFoam = frontmatterKeys.length === 1;

      let newContent = rawContent;
      if (onlyFoam) {
        // Remove the entire frontmatter block
        newContent = parsed.content;

        // If there's another frontmatter block, trim leading space
        const anotherFrontmatter = matter(newContent.trimStart()).matter !== '';
        if (anotherFrontmatter) {
          newContent = newContent.trimStart();
        }
      } else {
        // Remove only the foam_template bits
        newContent = removeFoamMetadata(rawContent);
      }

      return {
        metadata: foamMetadata as TemplateMetadata,
        content: newContent,
      };
    }

    // Backwards compatibility: support direct frontmatter keys
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
 * Removes foam_template metadata from frontmatter while preserving other metadata
 */
function removeFoamMetadata(contents: string): string {
  return contents.replace(
    /^\s*foam_template:.*?\n(?:\s*(?:filepath|name|description):.*\n)+/gm,
    ''
  );
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
