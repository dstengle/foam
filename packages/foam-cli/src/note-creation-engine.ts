import { URI, FileSystem } from './utils/fs';
import { Resolver } from './utils/variable-resolver';
import { Template } from './utils/template-loader';
import * as path from 'path';

/**
 * Characters that are invalid in file names
 */
const FILEPATH_UNALLOWED_CHARS = '\\#%&{}<>?*$!\'":@+`|=';

/**
 * Sanitizes a filepath by replacing invalid characters with dashes
 */
function sanitizeFilepath(filepath: string): string {
  const escapedChars = FILEPATH_UNALLOWED_CHARS.replace(/[\\^\-\]]/g, '\\$&');
  const regex = new RegExp(`[${escapedChars}]`, 'g');
  return filepath.replace(regex, '-');
}

export interface NoteCreationOptions {
  /**
   * The workspace root directory
   */
  workspaceRoot: string;
  /**
   * The path where the note should be created
   */
  notePath?: string;
  /**
   * The title of the note
   */
  title?: string;
  /**
   * The template to use
   */
  template: Template;
  /**
   * Custom variables to pass to the template
   */
  variables?: Record<string, string>;
  /**
   * The date to use for FOAM_DATE_* variables
   */
  date?: Date;
  /**
   * Whether to overwrite if file exists
   */
  overwrite?: boolean;
}

export interface NoteCreationResult {
  /**
   * The path where the note was created
   */
  filepath: string;
  /**
   * The content of the created note
   */
  content: string;
  /**
   * Whether a new file was created (false if file existed and was not overwritten)
   */
  created: boolean;
}

/**
 * Note creation engine for CLI
 */
export class NoteCreationEngine {
  /**
   * Creates a note from a template
   */
  async createNote(options: NoteCreationOptions): Promise<NoteCreationResult> {
    const {
      workspaceRoot,
      notePath,
      title,
      template,
      variables = {},
      date = new Date(),
      overwrite = false,
    } = options;

    // Create resolver with variables
    const givenValues = new Map(Object.entries(variables));
    const resolver = new Resolver(givenValues, date, title);

    // Resolve the template content
    let content = template.content;

    // If template has frontmatter metadata with filepath, use it to determine the path
    let resolvedPath: string;
    if (notePath) {
      resolvedPath = notePath;
    } else if (template.metadata.filepath) {
      // Resolve variables in the filepath from metadata
      resolvedPath = await resolver.resolveText(template.metadata.filepath);
    } else if (title) {
      // Use title as filename
      const safeName = sanitizeFilepath(title);
      resolvedPath = `${safeName}.md`;
    } else {
      throw new Error(
        'Either notePath, template filepath metadata, or title must be provided'
      );
    }

    // Make the path absolute if it's relative
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.join(workspaceRoot, resolvedPath);
    }

    // Sanitize the filepath
    const dirname = path.dirname(resolvedPath);
    const basename = path.basename(resolvedPath);
    const sanitizedBasename = sanitizeFilepath(basename);
    resolvedPath = path.join(dirname, sanitizedBasename);

    const noteUri = new URI(resolvedPath);

    // Check if file exists
    const exists = await FileSystem.fileExists(noteUri);
    if (exists && !overwrite) {
      throw new Error(
        `File already exists: ${resolvedPath}. Use --overwrite to replace it.`
      );
    }

    // Resolve template content
    const resolvedContent = await resolver.resolveText(content);

    // Write the file
    await FileSystem.writeFile(noteUri, resolvedContent);

    return {
      filepath: resolvedPath,
      content: resolvedContent,
      created: !exists || overwrite,
    };
  }
}
