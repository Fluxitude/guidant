/**
 * Path constants for Guidant application
 */

// .guidant directory structure paths
export const TASKMASTER_DIR = '.guidant';
export const TASKMASTER_TASKS_DIR = '.guidant/tasks';
export const TASKMASTER_DOCS_DIR = '.guidant/docs';
export const TASKMASTER_REPORTS_DIR = '.guidant/reports';
export const TASKMASTER_TEMPLATES_DIR = '.guidant/templates';

// Guidant configuration files
export const TASKMASTER_CONFIG_FILE = '.guidant/config.json';
export const TASKMASTER_STATE_FILE = '.guidant/state.json';
export const LEGACY_CONFIG_FILE = '.taskmasterconfig';

// Guidant report files
export const COMPLEXITY_REPORT_FILE =
	'.guidant/reports/task-complexity-report.json';
export const LEGACY_COMPLEXITY_REPORT_FILE =
	'scripts/task-complexity-report.json';

// Guidant PRD file paths
export const PRD_FILE = '.guidant/docs/prd.txt';
export const LEGACY_PRD_FILE = 'scripts/prd.txt';

// Guidant template files
export const EXAMPLE_PRD_FILE = '.guidant/templates/example_prd.txt';
export const LEGACY_EXAMPLE_PRD_FILE = 'scripts/example_prd.txt';

// Guidant task file paths
export const TASKMASTER_TASKS_FILE = '.guidant/tasks/tasks.json';
export const LEGACY_TASKS_FILE = 'tasks/tasks.json';

// General project files (not Task Master specific but commonly used)
export const ENV_EXAMPLE_FILE = '.env.example';
export const GITIGNORE_FILE = '.gitignore';

// Task file naming pattern
export const TASK_FILE_PREFIX = 'task_';
export const TASK_FILE_EXTENSION = '.txt';

/**
 * Project markers used to identify a guidant project root
 * These files/directories indicate that a directory is a Guidant project
 */
export const PROJECT_MARKERS = [
	'.guidant', // New guidant directory
	LEGACY_CONFIG_FILE, // .taskmasterconfig
	'tasks.json', // Generic tasks file
	LEGACY_TASKS_FILE, // tasks/tasks.json (legacy location)
	TASKMASTER_TASKS_FILE, // .guidant/tasks/tasks.json (new location)
	'.git', // Git repository
	'.svn' // SVN repository
];
