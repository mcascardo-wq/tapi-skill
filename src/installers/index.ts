import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

export interface DestinationConfig {
  dir: string;
  ext: string;
}

export const DESTINATIONS: Record<string, DestinationConfig> = {
  claude: { dir: '.claude/skills', ext: '.md' },
  cursor: { dir: '.cursor/rules', ext: '.mdc' },
  windsurf: { dir: '.windsurf/rules', ext: '.md' },
  project: { dir: '.tapi/skills', ext: '.md' },
};

export const AVAILABLE_SKILLS = ['base', 'auth', 'companies', 'servicios', 'agenda', 'recargas', 'tapi'];

export interface InstallOptions {
  force?: boolean;
}

/**
 * Get the skills directory from the package
 */
export function getSkillsDir(): string {
  // When running from dist/installers/, skills/ is at the package root (2 levels up)
  const currentDir = dirname(import.meta.url.replace('file://', ''));
  // currentDir = .../dist/installers, go up to dist, then up to package root
  return join(dirname(dirname(currentDir)), 'skills');
}

/**
 * Get the path to a specific skill file
 */
export function getSkillPath(skillName: string): string {
  return join(getSkillsDir(), `${skillName}.md`);
}

/**
 * Install a skill to a destination
 */
export function installSkill(
  skillName: string,
  destination: string,
  options: InstallOptions = {}
): { success: boolean; path: string; skipped?: boolean } {
  const config = DESTINATIONS[destination];
  if (!config) {
    throw new Error(`Unknown destination: ${destination}`);
  }

  const sourcePath = getSkillPath(skillName);
  if (!existsSync(sourcePath)) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  const targetDir = join(process.cwd(), config.dir);
  const targetPath = join(targetDir, `tapi-${skillName}${config.ext}`);

  // Check if file exists and we're not forcing
  if (existsSync(targetPath) && !options.force) {
    return { success: true, path: targetPath, skipped: true };
  }

  // Create directory if it doesn't exist
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Read source and write to destination
  const content = readFileSync(sourcePath, 'utf-8');
  writeFileSync(targetPath, content, 'utf-8');

  return { success: true, path: targetPath };
}

/**
 * Get installed skills for a destination
 */
export function getInstalledSkills(destination: string): string[] {
  const config = DESTINATIONS[destination];
  if (!config) return [];

  const targetDir = join(process.cwd(), config.dir);
  if (!existsSync(targetDir)) return [];

  const { readdirSync } = require('node:fs');
  const files: string[] = readdirSync(targetDir);
  
  return files
    .filter((f: string) => f.startsWith('tapi-') && (f.endsWith('.md') || f.endsWith('.mdc')))
    .map((f: string) => f.replace(/^tapi-/, '').replace(/\.(md|mdc)$/, ''));
}

/**
 * Check if a skill needs updating
 */
export function needsUpdate(skillName: string, destination: string): boolean {
  const config = DESTINATIONS[destination];
  if (!config) return false;

  const sourcePath = getSkillPath(skillName);
  const targetPath = join(process.cwd(), config.dir, `tapi-${skillName}${config.ext}`);

  if (!existsSync(targetPath)) return false;
  if (!existsSync(sourcePath)) return false;

  const sourceContent = readFileSync(sourcePath, 'utf-8');
  const targetContent = readFileSync(targetPath, 'utf-8');

  return sourceContent !== targetContent;
}
