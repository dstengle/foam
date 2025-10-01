# Foam CLI

Command-line interface for Foam - a personal knowledge management tool.

## Installation

Install the CLI globally:

```bash
npm install -g foam-cli
```

Or use directly with `npx`:

```bash
npx foam-cli create-note --title "My Note"
```

## Commands

### `foam create-note`

Create a new note from a template.

#### Usage

```bash
foam create-note [options]
```

#### Options

- `-t, --title <title>` - Title of the note
- `-p, --path <path>` - Path where the note should be created (relative to workspace or absolute)
- `--template <template>` - Path to template file (relative to workspace or absolute)
- `-w, --workspace <workspace>` - Workspace root directory (default: current directory)
- `-d, --date <date>` - Date to use for FOAM_DATE_* variables (YYYY-MM-DD format)
- `--overwrite` - Overwrite file if it already exists
- `-v, --variable <key=value>` - Custom variable (can be specified multiple times)

#### Examples

**Create a simple note:**

```bash
foam create-note --title "My Note"
```

This creates `My Note.md` in the current directory with default content.

**Create a note with a custom path:**

```bash
foam create-note --title "Meeting Notes" --path "meetings/2024-01-15.md"
```

**Create a note from a template:**

```bash
foam create-note --template .foam/templates/daily-note.md --title "Daily Log"
```

**Create a note with custom date:**

```bash
foam create-note --template .foam/templates/daily-note.md --date 2024-01-15
```

**Create a note with custom variables:**

```bash
foam create-note \
  --template .foam/templates/meeting-note.md \
  --title "Sprint Planning" \
  --variable PROJECT=FoamCLI \
  --variable ATTENDEES="Alice, Bob, Carol"
```

## Templates

Templates are markdown files that can include variables which will be resolved when creating a note.

### Template Variables

Foam CLI supports the following built-in variables:

#### Title Variables

- `$FOAM_TITLE` - The title of the note
- `$FOAM_TITLE_SAFE` - The title with special characters replaced with dashes
- `$FOAM_SLUG` - A URL-friendly slug of the title

#### Date Variables

- `$FOAM_DATE_YEAR` - Four-digit year (e.g., 2024)
- `$FOAM_DATE_YEAR_SHORT` - Two-digit year (e.g., 24)
- `$FOAM_DATE_MONTH` - Two-digit month (01-12)
- `$FOAM_DATE_MONTH_NAME` - Full month name (e.g., January)
- `$FOAM_DATE_MONTH_NAME_SHORT` - Short month name (e.g., Jan)
- `$FOAM_DATE_DATE` - Two-digit day of month (01-31)
- `$FOAM_DATE_DAY_ISO` - Day of month without leading zero (1-31)
- `$FOAM_DATE_WEEK` - Week number
- `$FOAM_DATE_DAY_NAME` - Full day name (e.g., Monday)
- `$FOAM_DATE_DAY_NAME_SHORT` - Short day name (e.g., Mon)
- `$FOAM_DATE_HOUR` - Two-digit hour (00-23)
- `$FOAM_DATE_MINUTE` - Two-digit minute (00-59)
- `$FOAM_DATE_SECOND` - Two-digit second (00-59)
- `$FOAM_DATE_SECONDS_UNIX` - Unix timestamp in seconds

### Custom Variables

You can define custom variables in your templates and pass their values via the `--variable` option:

```markdown
---
filepath: projects/$CUSTOM_PROJECT/$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE.md
---
# $FOAM_TITLE

**Project:** $CUSTOM_PROJECT  
**Author:** $CUSTOM_AUTHOR

## Content
```

Use it like:

```bash
foam create-note \
  --template template.md \
  --title "Project Update" \
  --variable CUSTOM_PROJECT=FoamCLI \
  --variable CUSTOM_AUTHOR="John Doe"
```

### Template Frontmatter

Templates can include YAML frontmatter to configure note creation:

```markdown
---
filepath: journal/$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE.md
name: Daily Note
description: Template for daily notes
---
# $FOAM_TITLE

Your content here.
```

#### Frontmatter Options

- `filepath` - Specifies the path where the note should be created (can include variables)
- `name` - Display name for the template
- `description` - Description of what the template is for

The `filepath` in frontmatter will be used if no `--path` option is provided.

## Example Templates

### Daily Note Template

`.foam/templates/daily-note.md`:

```markdown
---
filepath: journal/$FOAM_DATE_YEAR/$FOAM_DATE_MONTH/$FOAM_DATE_DATE.md
---
# $FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE

## Tasks

- [ ] 

## Notes

## Links
```

### Meeting Note Template

`.foam/templates/meeting-note.md`:

```markdown
---
filepath: meetings/$CUSTOM_PROJECT-$FOAM_DATE_YEAR$FOAM_DATE_MONTH$FOAM_DATE_DATE.md
---
# $FOAM_TITLE

**Date:** $FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE  
**Project:** $CUSTOM_PROJECT  
**Attendees:** $CUSTOM_ATTENDEES

## Agenda

## Discussion

## Action Items

## Next Steps
```

### Project Note Template

`.foam/templates/project.md`:

```markdown
---
filepath: projects/$FOAM_SLUG/README.md
---
# $FOAM_TITLE

## Overview

## Goals

## Resources

## Timeline
```

## Integration with Foam Workspace

The CLI is designed to work seamlessly with Foam workspaces. Place your templates in `.foam/templates/` directory in your workspace root.

Directory structure:

```
my-workspace/
├── .foam/
│   └── templates/
│       ├── daily-note.md
│       ├── meeting-note.md
│       └── project.md
├── journal/
├── meetings/
└── projects/
```

## License

MIT
