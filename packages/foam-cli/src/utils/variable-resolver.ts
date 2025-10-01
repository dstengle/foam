import dateformat from 'dateformat';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GithubSlugger = require('github-slugger');
import {
  SnippetParser,
  Variable,
  VariableResolver,
} from './snippetParser';

const knownFoamVariables = new Set([
  'FOAM_TITLE',
  'FOAM_TITLE_SAFE',
  'FOAM_SLUG',
  'FOAM_DATE_YEAR',
  'FOAM_DATE_YEAR_SHORT',
  'FOAM_DATE_MONTH',
  'FOAM_DATE_MONTH_NAME',
  'FOAM_DATE_MONTH_NAME_SHORT',
  'FOAM_DATE_DATE',
  'FOAM_DATE_DAY_ISO',
  'FOAM_DATE_WEEK',
  'FOAM_DATE_DAY_NAME',
  'FOAM_DATE_DAY_NAME_SHORT',
  'FOAM_DATE_HOUR',
  'FOAM_DATE_MINUTE',
  'FOAM_DATE_SECOND',
  'FOAM_DATE_SECONDS_UNIX',
]);

/**
 * Converts title to safe filename
 */
function toSlug(title: string): string {
  const slugger = new GithubSlugger();
  return slugger.slug(title);
}

/**
 * Sanitizes a string by removing invalid filename characters
 */
function sanitizeTitle(str: string): string {
  // Remove invalid filename characters
  return str.replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, '-');
}

export class Resolver implements VariableResolver {
  private promises = new Map<string, Promise<string | undefined>>();

  constructor(
    private givenValues: Map<string, string>,
    public foamDate: Date,
    foamTitle?: string
  ) {
    if (foamTitle) {
      this.givenValues.set('FOAM_TITLE', foamTitle);
    }
  }

  /**
   * Adds a variable definition in the resolver
   */
  define(name: string, value: string): void {
    this.givenValues.set(name, value);
  }

  /**
   * Gets all defined variables as a plain object
   */
  getVariables(): Record<string, string> {
    return Object.fromEntries(this.givenValues);
  }

  /**
   * Process a string, replacing the variables with their values
   */
  async resolveText(text: string): Promise<string> {
    let snippet = new SnippetParser().parse(text, false, false);
    const allVariablesInTemplate = new Set(
      snippet.variables().map(v => v.name)
    );

    await snippet.resolveVariables(this, allVariablesInTemplate);
    return snippet.snippetTextWithVariablesSubstituted(allVariablesInTemplate);
  }

  /**
   * Resolves a list of variables
   */
  async resolveAll(variables: Variable[]): Promise<Map<string, string>> {
    await Promise.all(variables.map(variable => variable.resolve(this)));

    const resolvedValues = new Map<string, string>();
    variables.forEach(variable => {
      if (variable.children.length > 0) {
        resolvedValues.set(variable.name, variable.toString());
      }
    });
    return resolvedValues;
  }

  /**
   * Resolve a variable
   */
  async resolveFromName(name: string): Promise<string> {
    const variable = new Variable(name);
    await variable.resolve(this);

    return (variable.children[0] ?? name).toString();
  }

  /**
   * Resolve a variable by its variable object
   */
  async resolve(variable: Variable): Promise<string | undefined> {
    const cachedPromise = this.promises.get(variable.name);
    if (cachedPromise) {
      return cachedPromise;
    }

    const promise = this.resolveVariable(variable.name);
    this.promises.set(variable.name, promise);
    return promise;
  }

  /**
   * Internal method to resolve a single variable
   */
  private async resolveVariable(name: string): Promise<string | undefined> {
    // Check if we have a predefined value
    if (this.givenValues.has(name)) {
      return this.givenValues.get(name);
    }

    // Handle FOAM_TITLE_SAFE
    if (name === 'FOAM_TITLE_SAFE') {
      const title = this.givenValues.get('FOAM_TITLE');
      return title ? sanitizeTitle(title) : undefined;
    }

    // Handle FOAM_SLUG
    if (name === 'FOAM_SLUG') {
      const title = this.givenValues.get('FOAM_TITLE');
      return title ? toSlug(title) : undefined;
    }

    // Handle date variables
    if (name.startsWith('FOAM_DATE_')) {
      return this.resolveDateVariable(name);
    }

    return undefined;
  }

  /**
   * Resolves date-related variables
   */
  private resolveDateVariable(name: string): string | undefined {
    const dateFormatMap: { [key: string]: string } = {
      FOAM_DATE_YEAR: 'yyyy',
      FOAM_DATE_YEAR_SHORT: 'yy',
      FOAM_DATE_MONTH: 'mm',
      FOAM_DATE_MONTH_NAME: 'mmmm',
      FOAM_DATE_MONTH_NAME_SHORT: 'mmm',
      FOAM_DATE_DATE: 'dd',
      FOAM_DATE_DAY_ISO: 'd',
      FOAM_DATE_WEEK: 'W',
      FOAM_DATE_DAY_NAME: 'dddd',
      FOAM_DATE_DAY_NAME_SHORT: 'ddd',
      FOAM_DATE_HOUR: 'HH',
      FOAM_DATE_MINUTE: 'MM',
      FOAM_DATE_SECOND: 'ss',
    };

    if (name === 'FOAM_DATE_SECONDS_UNIX') {
      return Math.floor(this.foamDate.getTime() / 1000).toString();
    }

    const format = dateFormatMap[name];
    if (format) {
      return dateformat(this.foamDate, format);
    }

    return undefined;
  }
}
