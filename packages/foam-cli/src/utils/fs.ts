import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * URI class for CLI - simpler version without VS Code dependencies
 */
export class URI {
  constructor(public readonly fsPath: string) {}

  static file(fsPath: string): URI {
    return new URI(path.resolve(fsPath));
  }

  static fromPath(fsPath: string): URI {
    return new URI(path.resolve(fsPath));
  }

  get path(): string {
    return this.fsPath;
  }

  get basename(): string {
    return path.basename(this.fsPath);
  }

  get dirname(): string {
    return path.dirname(this.fsPath);
  }

  joinPath(...parts: string[]): URI {
    return new URI(path.join(this.fsPath, ...parts));
  }

  forPath(newPath: string): URI {
    return new URI(path.resolve(this.dirname, newPath));
  }

  isAbsolute(): boolean {
    return path.isAbsolute(this.fsPath);
  }

  getName(): string {
    const basename = this.basename;
    const extIndex = basename.lastIndexOf('.');
    return extIndex > 0 ? basename.substring(0, extIndex) : basename;
  }

  toFsPath(): string {
    return this.fsPath;
  }

  toString(): string {
    return this.fsPath;
  }
}

/**
 * File system utilities for CLI
 */
export class FileSystem {
  static async readFile(uri: URI): Promise<string> {
    return await fs.readFile(uri.fsPath, 'utf-8');
  }

  static async writeFile(uri: URI, content: string): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(uri.fsPath), { recursive: true });
    await fs.writeFile(uri.fsPath, content, 'utf-8');
  }

  static async fileExists(uri: URI): Promise<boolean> {
    try {
      await fs.access(uri.fsPath);
      return true;
    } catch {
      return false;
    }
  }

  static async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
}
