import { 
  AVAILABLE_SKILLS, 
  DESTINATIONS, 
  installSkill,
  type InstallOptions 
} from '../installers/index.js';

interface InstallCommandOptions {
  cursor?: boolean;
  claude?: boolean;
  windsurf?: boolean;
  project?: boolean;
  all?: boolean;
  force?: boolean;
}

function getDestinations(options: InstallCommandOptions): string[] {
  const destinations: string[] = [];
  
  if (options.cursor) destinations.push('cursor');
  if (options.claude) destinations.push('claude');
  if (options.windsurf) destinations.push('windsurf');
  if (options.project) destinations.push('project');

  return destinations;
}

export function installCommand(skills: string[], options: InstallCommandOptions): void {
  const destinations = getDestinations(options);
  
  if (destinations.length === 0) {
    console.error('Error: Please specify at least one destination (--cursor, --claude, --windsurf, --project)');
    process.exit(1);
  }

  // If no skills specified or --all, install all skills
  const skillsToInstall = (skills.length === 0 || options.all) 
    ? AVAILABLE_SKILLS 
    : skills;

  // Validate skills
  for (const skill of skillsToInstall) {
    if (!AVAILABLE_SKILLS.includes(skill)) {
      console.error(`Error: Unknown skill '${skill}'`);
      console.error(`Available skills: ${AVAILABLE_SKILLS.join(', ')}`);
      process.exit(1);
    }
  }

  const installOptions: InstallOptions = {
    force: options.force,
  };

  let installed = 0;
  let skipped = 0;
  let errors = 0;

  for (const destination of destinations) {
    console.log(`\nInstalling to ${DESTINATIONS[destination].dir}:`);
    
    for (const skill of skillsToInstall) {
      try {
        const result = installSkill(skill, destination, installOptions);
        
        if (result.skipped) {
          console.log(`  ⏭  ${skill} (already exists, use --force to overwrite)`);
          skipped++;
        } else {
          console.log(`  ✓  ${skill}`);
          installed++;
        }
      } catch (error) {
        console.error(`  ✗  ${skill}: ${error instanceof Error ? error.message : error}`);
        errors++;
      }
    }
  }

  console.log(`\nDone: ${installed} installed, ${skipped} skipped, ${errors} errors\n`);
  
  if (errors > 0) {
    process.exit(1);
  }
}
