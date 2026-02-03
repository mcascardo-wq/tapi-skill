import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { getSkillsDir, AVAILABLE_SKILLS } from '../installers/index.js';
import { join } from 'node:path';

interface SkillInfo {
  name: string;
  description: string;
}

function getSkillDescription(skillPath: string): string {
  if (!existsSync(skillPath)) {
    return 'Description not available';
  }

  const content = readFileSync(skillPath, 'utf-8');
  const lines = content.split('\n');
  
  // Skip the title (first # line) and find the first non-empty paragraph
  let foundTitle = false;
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('# ')) {
      foundTitle = true;
      continue;
    }
    
    if (foundTitle && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('<!--')) {
      // Return first ~80 chars
      return trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed;
    }
  }

  return 'No description';
}

export function listSkills(): void {
  const skillsDir = getSkillsDir();
  
  console.log('\nAvailable TAPI skills:\n');
  
  const skills: SkillInfo[] = AVAILABLE_SKILLS.map(name => {
    const skillPath = join(skillsDir, `${name}.md`);
    return {
      name,
      description: getSkillDescription(skillPath),
    };
  });

  // Find max name length for alignment
  const maxNameLength = Math.max(...skills.map(s => s.name.length));

  for (const skill of skills) {
    const padding = ' '.repeat(maxNameLength - skill.name.length);
    console.log(`  ${skill.name}${padding}  ${skill.description}`);
  }

  console.log(`\nTotal: ${skills.length} skills\n`);
}
