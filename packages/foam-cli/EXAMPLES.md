# Foam CLI Examples

This directory contains example templates and usage scenarios for the Foam CLI.

## Quick Start

```bash
# Create a simple note
foam create-note --title "My First Note"

# Create from a template
foam create-note --template .foam/templates/daily-note.md --date 2024-01-15

# Create with custom variables
foam create-note \
  --template .foam/templates/meeting-note.md \
  --title "Sprint Planning" \
  --variable PROJECT="Foam CLI" \
  --variable ATTENDEES="Alice, Bob"
```

## Example Templates

### Daily Note Template

`.foam/templates/daily-note.md`:

```markdown
---
filepath: journal/$FOAM_DATE_YEAR/$FOAM_DATE_MONTH/$FOAM_DATE_DATE-daily.md
---
# Daily Note - $FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE

## Morning Reflection

## Tasks
- [ ] 

## Evening Reflection
```

**Usage:**

```bash
foam create-note \
  --template .foam/templates/daily-note.md \
  --title "Daily Journal" \
  --date 2024-01-15
```

**Result:** Creates `journal/2024/01/15-daily.md`

### Meeting Note Template

`.foam/templates/meeting-note.md`:

```markdown
---
filepath: meetings/$FOAM_DATE_YEAR/$FOAM_SLUG.md
---
# $FOAM_TITLE

**Date:** $FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE  
**Project:** $PROJECT  
**Attendees:** $ATTENDEES

## Agenda
## Discussion
## Action Items
```

**Usage:**

```bash
foam create-note \
  --template .foam/templates/meeting-note.md \
  --title "Sprint Planning Meeting" \
  --date 2024-01-15 \
  --variable PROJECT="Foam CLI" \
  --variable ATTENDEES="Alice, Bob, Carol"
```

**Result:** Creates `meetings/2024/sprint-planning-meeting.md`

## Directory Structure Example

After running the commands above, your workspace will look like:

```
foam-workspace/
├── .foam/
│   └── templates/
│       ├── daily-note.md
│       └── meeting-note.md
├── journal/
│   └── 2024/
│       └── 01/
│           └── 15-daily.md
├── meetings/
│   └── 2024/
│       └── sprint-planning-meeting.md
└── My First Note.md
```

## Integration with Scripts

You can integrate the CLI into shell scripts:

```bash
#!/bin/bash
# Create a daily note for today
foam create-note \
  --template .foam/templates/daily-note.md \
  --title "Daily Journal" \
  --date $(date +%Y-%m-%d)
```

Or in a cron job:

```cron
# Create daily note every day at 6 AM
0 6 * * * cd /path/to/foam-workspace && foam create-note --template .foam/templates/daily-note.md --title "Daily Journal" --date $(date +%Y-%m-%d)
```
