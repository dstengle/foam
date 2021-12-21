import {
  createMarkdownParser,
  createMarkdownReferences,
  ParserPlugin,
} from './markdown-provider';
import { DirectLink, WikiLink } from './model/note';
import { Logger } from './utils/log';
import { uriToSlug } from './utils/slug';
import { URI } from './model/uri';
import { FoamGraph } from './model/graph';
import { Range } from './model/range';
import { createTestWorkspace } from '../test/test-utils';

Logger.setLevel('error');

const pageA = `
# Page A

## Section
- [[page-b]]
- [[page-c]]
- [[Page D]]
- [[page e]]
`;

const pageB = `
# Page B

This references [[page-a]]`;

const pageC = `
# Page C
`;

const pageD = `
# Page D
`;

const pageE = `
# Page E
`;

const createNoteFromMarkdown = (path: string, content: string) =>
  createMarkdownParser([]).parse(URI.file(path), content);

describe('Markdown loader', () => {
  it('Converts markdown to notes', () => {
    const workspace = createTestWorkspace();
    workspace.set(createNoteFromMarkdown('/page-a.md', pageA));
    workspace.set(createNoteFromMarkdown('/page-b.md', pageB));
    workspace.set(createNoteFromMarkdown('/page-c.md', pageC));
    workspace.set(createNoteFromMarkdown('/page-d.md', pageD));
    workspace.set(createNoteFromMarkdown('/page-e.md', pageE));

    expect(
      workspace
        .list()
        .map(n => n.uri)
        .map(uriToSlug)
        .sort()
    ).toEqual(['page-a', 'page-b', 'page-c', 'page-d', 'page-e']);
  });

  it('Ingores external links', () => {
    const note = createNoteFromMarkdown(
      '/path/to/page-a.md',
      `
this is a [link to google](https://www.google.com)
`
    );
    expect(note.links.length).toEqual(0);
  });

  it('Ignores references to sections in the same file', () => {
    const note = createNoteFromMarkdown(
      '/path/to/page-a.md',
      `
this is a [link to intro](#introduction)
`
    );
    expect(note.links.length).toEqual(0);
  });

  it('Parses internal links correctly', () => {
    const note = createNoteFromMarkdown(
      '/path/to/page-a.md',
      'this is a [link to page b](../doc/page-b.md)'
    );
    expect(note.links.length).toEqual(1);
    const link = note.links[0] as DirectLink;
    expect(link.type).toEqual('link');
    expect(link.label).toEqual('link to page b');
    expect(link.target).toEqual('../doc/page-b.md');
  });

  it('Parses links that have formatting in label', () => {
    const note = createNoteFromMarkdown(
      '/path/to/page-a.md',
      'this is [**link** with __formatting__](../doc/page-b.md)'
    );
    expect(note.links.length).toEqual(1);
    const link = note.links[0] as DirectLink;
    expect(link.type).toEqual('link');
    expect(link.label).toEqual('link with formatting');
    expect(link.target).toEqual('../doc/page-b.md');
  });

  it('Parses wikilinks correctly', () => {
    const workspace = createTestWorkspace();
    const noteA = createNoteFromMarkdown('/page-a.md', pageA);
    const noteB = createNoteFromMarkdown('/page-b.md', pageB);
    const noteC = createNoteFromMarkdown('/page-c.md', pageC);
    const noteD = createNoteFromMarkdown('/Page D.md', pageD);
    const noteE = createNoteFromMarkdown('/page e.md', pageE);

    workspace
      .set(noteA)
      .set(noteB)
      .set(noteC)
      .set(noteD)
      .set(noteE);
    const graph = FoamGraph.fromWorkspace(workspace);

    expect(graph.getBacklinks(noteB.uri).map(l => l.source)).toEqual([
      noteA.uri,
    ]);
    expect(graph.getLinks(noteA.uri).map(l => l.target)).toEqual([
      noteB.uri,
      noteC.uri,
      noteD.uri,
      noteE.uri,
    ]);
  });

  it('Parses backlinks with an alias', () => {
    const note = createNoteFromMarkdown(
      '/path/to/page-a.md',
      'this is [[link|link alias]]. A link with spaces [[other link | spaced]]'
    );
    expect(note.links.length).toEqual(2);
    let link = note.links[0] as WikiLink;
    expect(link.type).toEqual('wikilink');
    expect(link.rawText).toEqual('[[link|link alias]]');
    expect(link.label).toEqual('link alias');
    expect(link.target).toEqual('link');
    link = note.links[1] as WikiLink;
    expect(link.type).toEqual('wikilink');
    expect(link.rawText).toEqual('[[other link | spaced]]');
    expect(link.label).toEqual('spaced');
    expect(link.target).toEqual('other link');
  });

  it('Skips wikilinks in codeblocks', () => {
    const noteA = createNoteFromMarkdown(
      '/dir1/page-a.md',
      `
this is some text with our [[first-wikilink]].

\`\`\`
this is inside a [[codeblock]]
\`\`\`

this is some text with our [[second-wikilink]].
    `
    );
    expect(noteA.links.map(l => l.label)).toEqual([
      'first-wikilink',
      'second-wikilink',
    ]);
  });

  it('Skips wikilinks in inlined codeblocks', () => {
    const noteA = createNoteFromMarkdown(
      '/dir1/page-a.md',
      `
this is some text with our [[first-wikilink]].

this is \`inside a [[codeblock]]\`

this is some text with our [[second-wikilink]].
    `
    );
    expect(noteA.links.map(l => l.label)).toEqual([
      'first-wikilink',
      'second-wikilink',
    ]);
  });
});

describe('Note Title', () => {
  it('should initialize note title if heading exists', () => {
    const note = createNoteFromMarkdown(
      '/page-a.md',
      `
# Page A
this note has a title
    `
    );
    expect(note.title).toBe('Page A');
  });

  it('should support wikilinks and urls in title', () => {
    const note = createNoteFromMarkdown(
      '/page-a.md',
      `
# Page A with [[wikilink]] and a [url](https://google.com)
this note has a title
    `
    );
    expect(note.title).toBe('Page A with wikilink and a url');
  });

  it('should default to file name if heading does not exist', () => {
    const note = createNoteFromMarkdown(
      '/page-d.md',
      `
This file has no heading.
      `
    );

    expect(note.title).toEqual('page-d');
  });

  it('should give precedence to frontmatter title over other headings', () => {
    const note = createNoteFromMarkdown(
      '/page-e.md',
      `
---
title: Note Title
date: 20-12-12
---

# Other Note Title
      `
    );

    expect(note.title).toBe('Note Title');
  });

  it('should support numbers', () => {
    const note1 = createNoteFromMarkdown('/157.md', `hello`);
    expect(note1.title).toBe('157');

    const note2 = createNoteFromMarkdown('/157.md', `# 158`);
    expect(note2.title).toBe('158');

    const note3 = createNoteFromMarkdown(
      '/157.md',
      `
---
title: 159
---

# 158
`
    );
    expect(note3.title).toBe('159');
  });

  it('should not break on empty titles (see #276)', () => {
    const note = createNoteFromMarkdown(
      '/Hello Page.md',
      `
#

this note has an empty title line
    `
    );
    expect(note.title).toEqual('Hello Page');
  });
});

describe('frontmatter', () => {
  it('should parse yaml frontmatter', () => {
    const note = createNoteFromMarkdown(
      '/page-e.md',
      `
---
title: Note Title
date: 20-12-12
---

# Other Note Title`
    );

    expect(note.properties.title).toBe('Note Title');
    expect(note.properties.date).toBe('20-12-12');
  });

  it('should parse empty frontmatter', () => {
    const note = createNoteFromMarkdown(
      '/page-f.md',
      `
---
---

# Empty Frontmatter
`
    );

    expect(note.properties).toEqual({});
  });

  it('should not fail when there are issues with parsing frontmatter', () => {
    const note = createNoteFromMarkdown(
      '/page-f.md',
      `
---
title: - one
 - two
 - #
---

`
    );

    expect(note.properties).toEqual({});
  });
});

describe('wikilinks definitions', () => {
  it('can generate links without file extension when includeExtension = false', () => {
    const workspace = createTestWorkspace();
    const noteA = createNoteFromMarkdown('/dir1/page-a.md', pageA);
    workspace
      .set(noteA)
      .set(createNoteFromMarkdown('/dir1/page-b.md', pageB))
      .set(createNoteFromMarkdown('/dir1/page-c.md', pageC));

    const noExtRefs = createMarkdownReferences(workspace, noteA.uri, false);
    expect(noExtRefs.map(r => r.url)).toEqual(['page-b', 'page-c']);
  });

  it('can generate links with file extension when includeExtension = true', () => {
    const workspace = createTestWorkspace();
    const noteA = createNoteFromMarkdown('/dir1/page-a.md', pageA);
    workspace
      .set(noteA)
      .set(createNoteFromMarkdown('/dir1/page-b.md', pageB))
      .set(createNoteFromMarkdown('/dir1/page-c.md', pageC));

    const extRefs = createMarkdownReferences(workspace, noteA.uri, true);
    expect(extRefs.map(r => r.url)).toEqual(['page-b.md', 'page-c.md']);
  });

  it('use relative paths', () => {
    const workspace = createTestWorkspace();
    const noteA = createNoteFromMarkdown('/dir1/page-a.md', pageA);
    workspace
      .set(noteA)
      .set(createNoteFromMarkdown('/dir2/page-b.md', pageB))
      .set(createNoteFromMarkdown('/dir3/page-c.md', pageC));

    const extRefs = createMarkdownReferences(workspace, noteA.uri, true);
    expect(extRefs.map(r => r.url)).toEqual([
      '../dir2/page-b.md',
      '../dir3/page-c.md',
    ]);
  });
});

describe('tags plugin', () => {
  it('can find tags in the text of the note', () => {
    const noteA = createNoteFromMarkdown(
      '/dir1/page-a.md',
      `
# this is a #heading
#this is some #text that includes #tags we #care-about.
    `
    );
    expect(noteA.tags).toEqual([
      { label: 'heading', range: Range.create(1, 12, 1, 20) },
      { label: 'this', range: Range.create(2, 0, 2, 5) },
      { label: 'text', range: Range.create(2, 14, 2, 19) },
      { label: 'tags', range: Range.create(2, 34, 2, 39) },
      { label: 'care-about', range: Range.create(2, 43, 2, 54) },
    ]);
  });

  it('will skip tags in codeblocks', () => {
    const noteA = createNoteFromMarkdown(
      '/dir1/page-a.md',
      `
this is some #text that includes #tags we #care-about.

\`\`\`
this is a #codeblock
\`\`\`
    `
    );
    expect(noteA.tags.map(t => t.label)).toEqual([
      'text',
      'tags',
      'care-about',
    ]);
  });

  it('will skip tags in inlined codeblocks', () => {
    const noteA = createNoteFromMarkdown(
      '/dir1/page-a.md',
      `
this is some #text that includes #tags we #care-about.
this is a \`inlined #codeblock\`
    `
    );
    expect(noteA.tags.map(t => t.label)).toEqual([
      'text',
      'tags',
      'care-about',
    ]);
  });
  it('can find tags as text in yaml', () => {
    const noteA = createNoteFromMarkdown(
      '/dir1/page-a.md',
      `
---
tags: hello, world  this_is_good
---
# this is a heading
this is some #text that includes #tags we #care-about.
    `
    );
    expect(noteA.tags.map(t => t.label)).toEqual([
      'hello',
      'world',
      'this_is_good',
      'text',
      'tags',
      'care-about',
    ]);
  });

  it('can find tags as array in yaml', () => {
    const noteA = createNoteFromMarkdown(
      '/dir1/page-a.md',
      `
---
tags: [hello, world,  this_is_good]
---
# this is a heading
this is some #text that includes #tags we #care-about.
    `
    );
    expect(noteA.tags.map(t => t.label)).toEqual([
      'hello',
      'world',
      'this_is_good',
      'text',
      'tags',
      'care-about',
    ]);
  });

  it('provides rough range for tags in yaml', () => {
    // For now it's enough to just get the YAML block range
    // in the future we might want to be more specific

    const noteA = createNoteFromMarkdown(
      '/dir1/page-a.md',
      `
---
tags: [hello, world, this_is_good]
---
# this is a heading
this is some text
    `
    );
    expect(noteA.tags[0]).toEqual({
      label: 'hello',
      range: Range.create(1, 0, 3, 3),
    });
  });
});

describe('Sections plugin', () => {
  it('should find sections within the note', () => {
    const note = createNoteFromMarkdown(
      '/dir1/page-a.md',
      `
# Section 1

This is the content of section 1.

## Section 1.1

This is the content of section 1.1.

# Section 2

This is the content of section 2.
      `
    );
    expect(note.sections).toHaveLength(3);
    expect(note.sections[0].label).toEqual('Section 1');
    expect(note.sections[0].range).toEqual(Range.create(1, 0, 9, 0));
    expect(note.sections[1].label).toEqual('Section 1.1');
    expect(note.sections[1].range).toEqual(Range.create(5, 0, 9, 0));
    expect(note.sections[2].label).toEqual('Section 2');
    expect(note.sections[2].range).toEqual(Range.create(9, 0, 13, 0));
  });

  it('should support wikilinks and links in the section label', () => {
    const note = createNoteFromMarkdown(
      '/dir1/section-with-links.md',
      `
# Section with [[wikilink]]

This is the content of section with wikilink

## Section with [url](https://google.com)

This is the content of section with url
      `
    );
    expect(note.sections).toHaveLength(2);
    expect(note.sections[0].label).toEqual('Section with wikilink');
    expect(note.sections[1].label).toEqual('Section with url');
  });
});

describe('parser plugins', () => {
  const testPlugin: ParserPlugin = {
    visit: (node, note) => {
      if (node.type === 'heading') {
        note.properties.hasHeading = true;
      }
    },
  };
  const parser = createMarkdownParser([testPlugin]);

  it('can augment the parsing of the file', () => {
    const note1 = parser.parse(
      URI.file('/path/to/a'),
      `
This is a test note without headings.
But with some content.
`
    );
    expect(note1.properties.hasHeading).toBeUndefined();

    const note2 = parser.parse(
      URI.file('/path/to/a'),
      `
# This is a note with header
and some content`
    );
    expect(note2.properties.hasHeading).toBeTruthy();
  });
});