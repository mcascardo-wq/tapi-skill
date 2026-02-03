import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { 
  DESTINATIONS, 
  AVAILABLE_SKILLS,
  needsUpdate,
  installSkill 
} from '../installers/index.js';

interface UpdateResult {
  destination: string;
  skill: string;
  updated: boolean;
}

export function updateCommand(): void {
  console.log('\nChecking for updates...\n');

  const results: UpdateResult[] = [];
  let updated = 0;
  let upToDate = 0;

  for (const [destination, config] of Object.entries(DESTINATIONS)) {
    const targetDir = join(process.cwd(), config.dir);
    
    if (!existsSync(targetDir)) {
      continue;
    }

    const files = readdirSync(targetDir);
    const installedSkills = files
      .filter(f => f.startsWith('tapi-') && (f.endsWith('.md') || f.endsWith('.mdc')))
      .map(f => f.replace(/^tapi-/, '').replace(/\.(md|mdc)$/, ''));

    for (const skill of installedSkills) {
      if (!AVAILABLE_SKILLS.includes(skill)) {
        continue;
      }

      if (needsUpdate(skill, destination)) {
        try {
          installSkill(skill, destination, { force: true });
          console.log(`  ✓  Updated ${skill} in ${config.dir}`);
          updated++;
          results.push({ destination, skill, updated: true });
        } catch (error) {
          console.error(`  ✗  Failed to update ${skill}: ${error instanceof Error ? error.message : error}`);
        }
      } else {
        upToDate++;
        results.push({ destination, skill, updated: false });
      }
    }
  }

  if (results.length === 0) {
    console.log('No TAPI skills found. Run `tapi-skills install` first.\n');
  } else {
    console.log(`\nDone: ${updated} updated, ${upToDate} already up to date\n`);
  }
}
