# Plan: Poner @tapi/skills productivo

## Resumen

Implementar el CLI completo en TypeScript, inicializar git, publicar el repo en GitHub bajo `mcascardo-wq`, y preparar la publicación en NPM.

## Paso 1: Limpiar archivos existentes

**Archivos a modificar:**
- `skills/base.md` — Remover referencias a suscripciones, limpiar TODOs con contenido razonable
- `README.md` — Remover suscripciones de la tabla y links de Obsidian, actualizar lista de skills

## Paso 2: Implementar el CLI en TypeScript

**Archivos a crear:**

### `src/cli.ts`
- Entry point con shebang `#!/usr/bin/env node`
- Usa commander.js con 3 comandos: `install`, `list`, `update`
- Lee versión de package.json

### `src/commands/install.ts`
- Acepta skills opcionales y flags de destino (`--cursor`, `--claude`, `--windsurf`, `--project`)
- `--all` instala todos los skills
- `--force` sobrescribe sin preguntar
- Si no se pasa skill, instala todos (incluyendo el orquestador `tapi.md`)
- Resuelve la ruta de los `.md` desde el paquete (`skills/`)
- Copia con prefijo `tapi-` al destino correspondiente

### `src/commands/list.ts`
- Lee los archivos en `skills/` del paquete
- Muestra nombre y primera línea de descripción de cada skill

### `src/commands/update.ts`
- Busca archivos `tapi-*.md` / `tapi-*.mdc` en las ubicaciones conocidas
- Compara con los del paquete y sobrescribe los que cambiaron

### `src/installers/index.ts`
- Un solo módulo con configuración por destino (no 4 archivos separados)
- Config map: `{ claude: { dir: '.claude/skills', ext: '.md' }, cursor: { dir: '.cursor/rules', ext: '.mdc' }, windsurf: { dir: '.windsurf/rules', ext: '.md' }, project: { dir: '.tapi/skills', ext: '.md' } }`
- Función `installSkill(skillPath, destination, options)` reutilizable
- Crea directorios si no existen (`mkdir -p`)

### Skills disponibles (hardcoded)
```
base, auth, servicios, agenda, recargas, tapi (orquestador)
```

## Paso 3: Configuración del proyecto

- Crear `.gitignore` (node_modules, dist, *.tgz)
- Crear `.npmrc` si es necesario para el scope
- Actualizar `package.json`: remover suscripciones de keywords si aplica, verificar que `files` incluya `dist` y `skills`

## Paso 4: Build y test local

```bash
npm install
npm run build
npm link
tapi-skills list
tapi-skills install --claude
tapi-skills install recargas --cursor
```

Verificar que:
- `tapi-skills list` muestra los 6 skills (base, auth, servicios, agenda, recargas, tapi)
- `tapi-skills install --claude` crea archivos en `.claude/skills/tapi-*.md`
- `tapi-skills install --cursor` crea archivos en `.cursor/rules/tapi-*.mdc`
- Los archivos copiados tienen el contenido correcto

## Paso 5: Git + GitHub

```bash
git init
git add .
git commit -m "Initial commit: @tapi/skills CLI v1.0.0"
gh repo create mcascardo-wq/tapi-skills --public --source=. --push
```

## Paso 6: Publicar en NPM

El usuario necesita:
1. Crear cuenta en npmjs.com
2. Crear la organización `@tapi` en NPM (o usar otro scope)
3. `npm login`
4. `npm publish --access public`

Esto lo dejamos documentado pero no lo ejecutamos hasta que el usuario tenga el scope configurado.

## Verificación

1. `npm run build` compila sin errores
2. `tapi-skills list` muestra los 6 skills
3. `tapi-skills install --claude` copia correctamente a `.claude/skills/`
4. `tapi-skills install --cursor` copia con extensión `.mdc` a `.cursor/rules/`
5. `tapi-skills install recargas --project` copia solo el skill de recargas
6. `tapi-skills install --all --claude` copia todos los skills
7. El repo se crea correctamente en GitHub
