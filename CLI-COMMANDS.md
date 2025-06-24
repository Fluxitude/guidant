# Guidant CLI Commands Reference

This document provides a comprehensive reference for all Guidant CLI commands, organized by category.

## Table of Contents

- [Project Setup & Configuration](#project-setup--configuration)
- [Task Generation](#task-generation)
- [Task Management](#task-management)
- [Subtask Management](#subtask-management)
- [Task Analysis & Breakdown](#task-analysis--breakdown)
- [Task Navigation & Viewing](#task-navigation--viewing)
- [Tag Management](#tag-management)
- [Dependency Management](#dependency-management)
- [Discovery & Research](#discovery--research)
- [Sprint & Performance Management](#sprint--performance-management)
- [Global Options](#global-options)

---

## Project Setup & Configuration

### `guidant init`
Initialize a new project with Guidant structure.

**Usage:**
```bash
guidant init [options]
```

**Options:**
- `-y, --yes` - Skip prompts and use default values
- `-n, --name <name>` - Project name
- `-d, --description <description>` - Project description
- `-v, --version <version>` - Project version (default: 0.1.0)
- `-a, --author <author>` - Author name
- `--skip-install` - Skip installing dependencies
- `--dry-run` - Show what would be done without making changes
- `--aliases` - Add shell aliases (tm, taskmaster)

**Examples:**
```bash
guidant init
guidant init -y --name "My Project" --description "A sample project"
guidant init --dry-run
```

### `guidant models`
View current AI model configuration and available models.

**Usage:**
```bash
guidant models [options]
```

**Options:**
- `--setup` - Run interactive setup to configure AI models
- `--set-main <model_id>` - Set the primary model for task generation
- `--set-research <model_id>` - Set the model for research operations
- `--set-fallback <model_id>` - Set the fallback model (optional)
- `--list-available-models` - List all available models with costs
- `--ollama` - Indicates the set model ID is a custom Ollama model
- `--openrouter` - Indicates the set model ID is a custom OpenRouter model

**Examples:**
```bash
guidant models
guidant models --setup
guidant models --set-main claude-3-5-sonnet-20241022
guidant models --set-research gemini-2.5-pro
guidant models --list-available-models
```

---

## Task Generation

### `guidant parse-prd`
Parse a PRD file and generate tasks.

**Usage:**
```bash
guidant parse-prd [file] [options]
```

**Options:**
- `-i, --input <file>` - Path to the PRD file (alternative to positional argument)
- `-o, --output <file>` - Output file path (default: .guidant/tasks/tasks.json)
- `-n, --num-tasks <number>` - Number of tasks to generate (default: 10)
- `-f, --force` - Skip confirmation when overwriting existing tasks
- `--append` - Append new tasks to existing tasks.json instead of overwriting
- `-r, --research` - Use Perplexity AI for research-backed task generation

**Examples:**
```bash
guidant parse-prd prd.txt
guidant parse-prd --input=requirements.md --num-tasks=15
guidant parse-prd prd.txt --research --append
```

### `guidant generate`
Create individual task files from tasks.json.

**Usage:**
```bash
guidant generate [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file (default: .guidant/tasks/tasks.json)
- `-o, --output <dir>` - Output directory (default: same as tasks file)
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant generate
guidant generate --output ./task-files
guidant generate --tag feature-auth
```

---

## Task Management

### `guidant list`
List all tasks with their status.

**Usage:**
```bash
guidant list [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `-r, --report <report>` - Path to the complexity report file
- `-s, --status <status>` - Filter tasks by status (pending, done, in-progress, etc.)
- `--with-subtasks` - Include subtasks in the listing
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant list
guidant list --status pending
guidant list --with-subtasks
guidant list --tag feature-auth
```

### `guidant set-status`
Update task status.

**Usage:**
```bash
guidant set-status <id> <status> [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--tag <tag>` - Specify tag context for task operations

**Valid statuses:** pending, done, in-progress, review, deferred, cancelled

**Examples:**
```bash
guidant set-status 1 done
guidant set-status 2.3 in-progress
guidant set-status 5,6,7 pending
```

### `guidant add-task`
Add a new task using AI.

**Usage:**
```bash
guidant add-task [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `-p, --prompt <prompt>` - Description of the task to add (required if not using manual fields)
- `-t, --title <title>` - Task title (for manual task creation)
- `-d, --description <description>` - Task description (for manual task creation)
- `--details <details>` - Implementation details (for manual task creation)
- `--dependencies <dependencies>` - Comma-separated list of task IDs this task depends on
- `--priority <priority>` - Task priority (high, medium, low) (default: medium)
- `--test-strategy <strategy>` - Test strategy (for manual task creation)
- `-r, --research` - Use research capabilities for task creation
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant add-task --prompt "Implement user authentication system"
guidant add-task --title "Setup Database" --description "Configure PostgreSQL" --priority high
guidant add-task --prompt "Add OAuth integration" --dependencies 1,2 --research
```

### `guidant update`
Update multiple tasks with ID >= "from" based on new information.

**Usage:**
```bash
guidant update [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--from <id>` - Task ID to start updating from (default: 1)
- `-p, --prompt <text>` - Prompt explaining the changes or new context (required)
- `-r, --research` - Use Perplexity AI for research-backed task updates
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant update --from 5 --prompt "Changed to use React instead of Vue"
guidant update --from 1 --prompt "Added security requirements" --research
```

### `guidant update-task`
Update a single specific task with new information.

**Usage:**
```bash
guidant update-task [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--id <id>` - ID of the task to update (required)
- `-p, --prompt <text>` - New information or context to incorporate (required)
- `--append` - Append timestamped information instead of full update
- `-r, --research` - Use Perplexity AI for research-backed updates
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant update-task --id 5 --prompt "Add rate limiting to API endpoints"
guidant update-task --id 3 --prompt "Security audit completed" --append
```

### `guidant remove-task`
Permanently remove a task or subtask.

**Usage:**
```bash
guidant remove-task [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--id <id>` - ID of the task or subtask to remove (required)
- `--confirm` - Skip confirmation prompt
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant remove-task --id 5
guidant remove-task --id 3.2 --confirm
guidant remove-task --id 1,2,3 --confirm
```

---

## Subtask Management

### `guidant add-subtask`
Add a new subtask to a parent task.

**Usage:**
```bash
guidant add-subtask [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--id <id>` - Parent task ID (required)
- `--title <title>` - Title for the new subtask (when creating new)
- `--description <description>` - Description for the new subtask
- `--details <details>` - Implementation details for the new subtask
- `--task-id <id>` - Existing task ID to convert to subtask
- `--dependencies <dependencies>` - Comma-separated list of dependency IDs
- `--status <status>` - Status for the new subtask (default: pending)
- `--skip-generate` - Skip regenerating task files
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant add-subtask --id 5 --title "Setup authentication middleware"
guidant add-subtask --id 3 --task-id 7  # Convert task 7 to subtask of task 3
```

### `guidant remove-subtask`
Remove a subtask from its parent task.

**Usage:**
```bash
guidant remove-subtask [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--id <id>` - Subtask ID to remove in format 'parentId.subtaskId' (required)
- `--convert` - Convert the subtask to a standalone task instead of deleting
- `--skip-generate` - Skip regenerating task files
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant remove-subtask --id 5.2
guidant remove-subtask --id 3.1 --convert
```

### `guidant clear-subtasks`
Remove all subtasks from specified tasks.

**Usage:**
```bash
guidant clear-subtasks [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--id <id>` - Task IDs (comma-separated) to clear subtasks from
- `--all` - Clear subtasks from all tasks
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant clear-subtasks --id 5
guidant clear-subtasks --id 1,2,3
guidant clear-subtasks --all
```

---

## Task Analysis & Breakdown

### `guidant analyze-complexity`
Analyze tasks and generate expansion recommendations.

**Usage:**
```bash
guidant analyze-complexity [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--from <id>` - Starting task ID in a range to analyze
- `--to <id>` - Ending task ID in a range to analyze
- `--ids <ids>` - Comma-separated list of task IDs to analyze specifically
- `--threshold <number>` - Complexity score threshold (1-10) to recommend expansion (default: 5)
- `-o, --output <file>` - Output file path for the report
- `-r, --research` - Use Perplexity AI for research-backed analysis
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant analyze-complexity
guidant analyze-complexity --threshold 7 --research
guidant analyze-complexity --ids 1,3,5 --output complexity-report.json
```

### `guidant complexity-report`
Display the complexity analysis report.

**Usage:**
```bash
guidant complexity-report [options]
```

**Options:**
- `-f, --file <file>` - Path to the report file (default: .guidant/reports/task-complexity-report.json)
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant complexity-report
guidant complexity-report --file custom-report.json
```

### `guidant expand`
Break down tasks into detailed subtasks.

**Usage:**
```bash
guidant expand [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--id <id>` - ID of task to expand (required)
- `--num <number>` - Number of subtasks to generate
- `--force` - Force expansion even if subtasks exist
- `-p, --prompt <text>` - Additional context for subtask generation
- `-r, --research` - Use research role for generation
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant expand --id 5 --num 3
guidant expand --id 2 --research --prompt "Focus on security aspects"
```

### `guidant expand-all`
Expand all pending tasks with subtasks.

**Usage:**
```bash
guidant expand-all [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--force` - Force regeneration of subtasks for tasks that already have them
- `--num <number>` - Target number of subtasks per task
- `-p, --prompt <text>` - Additional context to guide subtask generation
- `-r, --research` - Enable research-backed subtask generation
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant expand-all
guidant expand-all --force --research
guidant expand-all --num 5 --prompt "Focus on testing and validation"
```

### `guidant research`
Perform AI-powered research queries with project context.

**Usage:**
```bash
guidant research "<query>" [options]
```

**Options:**
- `--task-ids <ids>` - Comma-separated list of task/subtask IDs for context
- `--file-paths <paths>` - Comma-separated list of file paths for context
- `--custom-context <text>` - Additional custom context text
- `--include-project-tree` - Include project file tree structure in context
- `--detail-level <level>` - Detail level: low, medium, high (default: medium)
- `--save-to <id>` - Auto-save results to task/subtask ID
- `--save-to-file` - Save research results to .guidant/docs/research/ directory
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant research "How should I implement user authentication?"
guidant research "Best practices for API security" --task-ids 15,23.2 --detail-level high
guidant research "Database optimization techniques" --save-to 5.3 --save-to-file
```

---

## Task Navigation & Viewing

### `guidant next`
Show the next task to work on based on dependencies.

**Usage:**
```bash
guidant next [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--complexity-report <file>` - Path to the complexity report file
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant next
guidant next --tag feature-auth
```

### `guidant show`
Display detailed information about a specific task.

**Usage:**
```bash
guidant show [id] [options]
```

**Options:**
- `-i, --id <id>` - Task ID(s) to show (comma-separated for multiple)
- `-s, --status <status>` - Filter subtasks by status
- `-f, --file <file>` - Path to the tasks file
- `-r, --report <report>` - Path to the complexity report file
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant show 5
guidant show 1,2,3
guidant show --id 5.2 --status pending
```

---

## Tag Management

### `guidant tags`
List all available tags with task counts.

**Usage:**
```bash
guidant tags [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--show-metadata` - Show detailed metadata for each tag

**Examples:**
```bash
guidant tags
guidant tags --show-metadata
```

### `guidant add-tag`
Create a new tag context for organizing tasks.

**Usage:**
```bash
guidant add-tag [tagName] [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--copy-from-current` - Copy tasks from the current tag to the new tag
- `--copy-from <tag>` - Copy tasks from the specified tag to the new tag
- `--from-branch` - Create tag name from current git branch (ignores tagName argument)
- `-d, --description <text>` - Optional description for the tag

**Examples:**
```bash
guidant add-tag feature-auth
guidant add-tag feature-auth --copy-from-current
guidant add-tag feature-auth --copy-from master --description "Authentication feature"
guidant add-tag --from-branch
```

### `guidant use-tag`
Switch to a different tag context.

**Usage:**
```bash
guidant use-tag <tagName> [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file

**Examples:**
```bash
guidant use-tag feature-auth
guidant use-tag master
```

### `guidant delete-tag`
Delete an existing tag and all its tasks.

**Usage:**
```bash
guidant delete-tag <tagName> [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--yes` - Skip confirmation prompts

**Examples:**
```bash
guidant delete-tag feature-old
guidant delete-tag feature-old --yes
```

### `guidant rename-tag`
Rename an existing tag.

**Usage:**
```bash
guidant rename-tag <oldName> <newName> [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file

**Examples:**
```bash
guidant rename-tag feature-auth auth-system
```

### `guidant copy-tag`
Copy an existing tag to create a new tag with the same tasks.

**Usage:**
```bash
guidant copy-tag <sourceName> <targetName> [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `-d, --description <text>` - Optional description for the new tag

**Examples:**
```bash
guidant copy-tag master feature-backup
guidant copy-tag auth-system auth-v2 --description "Version 2 of auth system"
```

---

## Dependency Management

### `guidant add-dependency`
Add a dependency to a task.

**Usage:**
```bash
guidant add-dependency [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--id <id>` - ID of task that will depend on another task (required)
- `--depends-on <id>` - ID of task that will become a dependency (required)
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant add-dependency --id 5 --depends-on 3
guidant add-dependency --id 7 --depends-on 2
```

### `guidant remove-dependency`
Remove a dependency from a task.

**Usage:**
```bash
guidant remove-dependency [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--id <id>` - Task ID to remove dependency from (required)
- `--depends-on <id>` - Task ID to remove as a dependency (required)
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant remove-dependency --id 5 --depends-on 3
```

### `guidant validate-dependencies`
Check tasks for dependency issues without making changes.

**Usage:**
```bash
guidant validate-dependencies [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant validate-dependencies
```

### `guidant fix-dependencies`
Fix invalid dependencies automatically.

**Usage:**
```bash
guidant fix-dependencies [options]
```

**Options:**
- `-f, --file <file>` - Path to the tasks file
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant fix-dependencies
```

---

## Discovery & Research

### `guidant start-discovery-session`
Begin discovery workflow for new projects.

**Usage:**
```bash
guidant start-discovery-session [options]
```

**Options:**
- `--project-name <name>` - Name of the project for discovery session (required)
- `--user-preferences <json>` - User preferences and project context

**Examples:**
```bash
guidant start-discovery-session --project-name "E-commerce Platform"
```

### `guidant research-market-opportunity`
Conduct market research and competitive analysis.

**Usage:**
```bash
guidant research-market-opportunity [options]
```

**Options:**
- `--session-id <id>` - Discovery session ID (required)
- `--research-queries <queries>` - Market research queries (1-5 queries)
- `--target-market <market>` - Target market or industry segment
- `--competitors <competitors>` - Known competitors or similar products
- `--research-focus <focus>` - Primary research focus area

**Examples:**
```bash
guidant research-market-opportunity --session-id abc123 --target-market "B2B SaaS"
```

### `guidant validate-technical-feasibility`
Validate technical feasibility using Context7 and architecture recommendations.

**Usage:**
```bash
guidant validate-technical-feasibility [options]
```

**Options:**
- `--session-id <id>` - Discovery session ID (required)
- `--technologies <tech>` - Technologies to validate (required)
- `--project-type <type>` - Type of project (required)
- `--features <features>` - Key features to validate technical feasibility for
- `--constraints <constraints>` - Technical constraints
- `--scale <scale>` - Expected project scale (small, medium, large, enterprise)

**Examples:**
```bash
guidant validate-technical-feasibility --session-id abc123 --technologies "React,Node.js,PostgreSQL" --project-type "web application"
```

### `guidant synthesize-requirements`
Synthesize discovery findings into structured requirements.

**Usage:**
```bash
guidant synthesize-requirements [options]
```

**Options:**
- `--session-id <id>` - Discovery session ID (required)
- `--problem-statement <statement>` - Clear problem statement (required)
- `--target-users <users>` - Target user groups (required)
- `--success-criteria <criteria>` - Success criteria and key metrics (required)
- `--functional-requirements <requirements>` - Functional requirements (3-20 requirements)
- `--non-functional-requirements <requirements>` - Non-functional requirements

**Examples:**
```bash
guidant synthesize-requirements --session-id abc123 --problem-statement "Need efficient task management" --target-users "developers,managers"
```

### `guidant generate-prd`
Generate a comprehensive Product Requirements Document.

**Usage:**
```bash
guidant generate-prd [options]
```

**Options:**
- `--session-id <id>` - Discovery session ID (required)
- `--template-type <type>` - PRD template type (COMPREHENSIVE, MINIMAL, TECHNICAL_FOCUSED)
- `--ai-enhancement` - Use AI to enhance content quality and completeness (default: true)
- `--include-research-data` - Include research data appendix in PRD (default: true)
- `--output-path <path>` - Output directory path for saving PRD file
- `--custom-sections <sections>` - Additional custom sections to include

**Examples:**
```bash
guidant generate-prd --session-id abc123
guidant generate-prd --session-id abc123 --template-type TECHNICAL_FOCUSED --output-path ./docs
```

### `guidant assess-prd-quality`
Assess PRD quality with comprehensive scoring and recommendations.

**Usage:**
```bash
guidant assess-prd-quality [options]
```

**Options:**
- `--session-id <id>` - Discovery session ID (if assessing generated PRD)
- `--prd-file-path <path>` - Path to PRD file to assess (alternative to sessionId)
- `--prd-content <content>` - PRD content text to assess directly
- `--assessment-type <type>` - Type of quality assessment (comprehensive, quick, focused)
- `--focus-areas <areas>` - Specific areas to focus assessment on
- `--generate-report` - Generate detailed assessment report file

**Examples:**
```bash
guidant assess-prd-quality --session-id abc123
guidant assess-prd-quality --prd-file-path ./prd.md --assessment-type comprehensive
```

---

## Sprint & Performance Management

### `guidant prioritize-tasks`
AI-driven task prioritization using multiple criteria.

**Usage:**
```bash
guidant prioritize-tasks [options]
```

**Options:**
- `--method <method>` - Prioritization method (ai, complexity, dependencies, business_value, custom)
- `--criteria <criteria>` - Custom prioritization criteria (for custom method)
- `--filter-status <status>` - Filter tasks by status for prioritization (todo, in-progress, all)
- `--max-tasks <number>` - Maximum number of tasks to prioritize (default: 20)
- `--include-research` - Include market research insights in prioritization
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant prioritize-tasks
guidant prioritize-tasks --method complexity --max-tasks 10
guidant prioritize-tasks --include-research --filter-status todo
```

### `guidant manage-sprint`
Sprint operations including creation, planning, and tracking.

**Usage:**
```bash
guidant manage-sprint [options]
```

**Options:**
- `--action <action>` - Sprint action (create, plan, start, complete, status, list)
- `--sprint-name <name>` - Name for the sprint (required for create action)
- `--duration <days>` - Sprint duration in days (default: 14)
- `--capacity <number>` - Team capacity for the sprint (story points or hours)
- `--goals <goals>` - Sprint goals and objectives
- `--task-ids <ids>` - Comma-separated task IDs to add to sprint (for plan action)
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant manage-sprint --action create --sprint-name "Sprint 1" --duration 14
guidant manage-sprint --action plan --task-ids 1,2,3,4
guidant manage-sprint --action status
```

### `guidant generate-burndown`
Generate burndown charts and sprint analytics.

**Usage:**
```bash
guidant generate-burndown [options]
```

**Options:**
- `--type <type>` - Type of burndown chart (sprint, project, velocity, cumulative)
- `--format <format>` - Output format (markdown, ascii, data)
- `--sprint-name <name>` - Specific sprint name (for sprint type)
- `--timeframe <days>` - Timeframe in days for project/velocity charts (default: 30)
- `--include-projections` - Include trend projections and forecasts
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant generate-burndown --type sprint
guidant generate-burndown --type project --timeframe 60 --format markdown
guidant generate-burndown --type velocity --include-projections
```

### `guidant generate-progress-summary`
Generate AI-powered progress summaries for meetings and reports.

**Usage:**
```bash
guidant generate-progress-summary [options]
```

**Options:**
- `--summary-type <type>` - Type of summary (daily, weekly, sprint, handoff, meeting)
- `--audience <audience>` - Target audience (technical, management, stakeholder, team)
- `--include-blockers` - Include blockers and risks in the summary
- `--include-metrics` - Include quantitative metrics in the summary
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant generate-progress-summary --summary-type weekly --audience management
guidant generate-progress-summary --summary-type daily --include-blockers --include-metrics
```

### `guidant generate-dashboard`
Generate comprehensive markdown-based dashboards.

**Usage:**
```bash
guidant generate-dashboard [options]
```

**Options:**
- `--dashboard-type <type>` - Type of dashboard (project, sprint, team, research, performance)
- `--format <format>` - Output format (markdown, html, json)
- `--timeframe <days>` - Timeframe in days for data analysis (default: 30)
- `--include-visualizations` - Include ASCII charts and progress bars
- `--include-research-metrics` - Include research cost and accuracy metrics
- `--save-to-disk` - Save dashboard to .guidant/reports/ directory
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant generate-dashboard --dashboard-type project
guidant generate-dashboard --dashboard-type sprint --format html --save-to-disk
```

### `guidant track-performance`
Track and analyze performance metrics.

**Usage:**
```bash
guidant track-performance [options]
```

**Options:**
- `--action <action>` - Performance tracking action (record, analyze, report, optimize, reset)
- `--metric-type <type>` - Type of metric (usage, success, cost, accuracy, velocity, quality)
- `--data <data>` - Performance data to record (for record action)
- `--timeframe <days>` - Analysis timeframe in days (default: 30)
- `--include-recommendations` - Include optimization recommendations
- `--save-report` - Save performance report to disk
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant track-performance --action analyze --metric-type velocity
guidant track-performance --action report --timeframe 60 --include-recommendations
```

### `guidant get-work-context`
Get context about current work progress and next steps.

**Usage:**
```bash
guidant get-work-context [options]
```

**Options:**
- `--days <number>` - Number of days to look back for recent activity (default: 7)
- `--include-completed` - Include recently completed tasks in the context
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant get-work-context
guidant get-work-context --days 14 --include-completed
```

### `guidant manage-work-session`
Manage work sessions for memory-friendly workflows.

**Usage:**
```bash
guidant manage-work-session [options]
```

**Options:**
- `--action <action>` - Action to perform (save, resume, list, clear)
- `--session-name <name>` - Name for the session (required for save action)
- `--notes <notes>` - Additional notes or context for the session
- `--max-sessions <number>` - Maximum number of sessions to keep (for clear action, default: 10)
- `--tag <tag>` - Specify tag context for task operations

**Examples:**
```bash
guidant manage-work-session --action save --session-name "auth-feature-work"
guidant manage-work-session --action resume --session-name "auth-feature-work"
guidant manage-work-session --action list
```

---

## Global Options

Most commands support these global options:

- `-f, --file <file>` - Path to the tasks file (default: .guidant/tasks/tasks.json)
- `--tag <tag>` - Specify tag context for task operations (uses current tag if not specified)
- `--help` - Display help for the specific command
- `--version` - Display Guidant version information

## Environment Variables

Guidant uses these environment variables for configuration:

- `GUIDANT_DOCS_DIR` - Directory for documentation (required for MCP)
- `ANTHROPIC_API_KEY` - Claude API key
- `OPENAI_API_KEY` - OpenAI API key
- `PERPLEXITY_API_KEY` - Perplexity API key
- `VERTEX_PROJECT_ID` - Google Cloud project ID
- `VERTEX_LOCATION` - Google Cloud region
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Google Cloud credentials JSON
- `TAVILY_API_KEY` - Tavily search API key
- `DEBUG` - Enable debug logging (set to `guidant:*`)

## Status Values

Valid task status values:
- `pending` - Task is ready to be worked on
- `in-progress` - Task is currently being worked on
- `done` - Task has been completed
- `review` - Task is under review
- `deferred` - Task has been postponed
- `cancelled` - Task has been cancelled
- `blocked` - Task is blocked by dependencies or issues

## Priority Values

Valid task priority values:
- `high` - High priority task
- `medium` - Medium priority task (default)
- `low` - Low priority task

---

For more detailed information about specific commands, use:
```bash
guidant <command> --help
```

For general help and command overview:
```bash
guidant --help
```
