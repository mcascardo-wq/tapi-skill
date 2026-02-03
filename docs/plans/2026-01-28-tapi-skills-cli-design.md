# @tapi/skills CLI - Design Document

## Objetivo

Crear un CLI público en NPM que permita a desarrolladores instalar "skills" (archivos de contexto markdown) en sus proyectos para que sus AI coding assistants (Cursor, Claude Code, Windsurf, etc.) entiendan cómo integrar con TAPI.

**Metas principales**:
- Acelerar integración: El dev dice "intégrame con TAPI" y el AI sabe exactamente cómo hacerlo
- Estandarizar implementaciones: Todos siguen los mismos patrones y mejores prácticas

## Arquitectura

```
@tapi/skills/
├── src/
│   ├── cli.ts              # Entry point, parsea comandos
│   ├── commands/
│   │   ├── install.ts      # Lógica de instalación
│   │   ├── update.ts       # Actualiza skills existentes
│   │   └── list.ts         # Lista skills disponibles
│   ├── installers/
│   │   ├── project.ts      # Instala en .tapi/skills/
│   │   ├── cursor.ts       # Instala en .cursor/rules/
│   │   ├── claude.ts       # Instala en .claude/skills/
│   │   └── windsurf.ts     # Instala en .windsurf/rules/
│   └── skills/             # Skills embebidos en el paquete
│       ├── base.md
│       ├── auth.md
│       ├── servicios.md
│       ├── agenda.md
│       ├── recargas.md
│       └── suscripciones.md
├── package.json
└── tsconfig.json
```

Los skills viven dentro del paquete NPM (no se descargan de un servidor externo). Cuando se publica una nueva versión del paquete, los skills se actualizan.

## Comandos

### `install [skills...] [destino]`

```bash
# Instalar skill base (default si no se especifica skill)
npx @tapi/skills install --project
npx @tapi/skills install --cursor
npx @tapi/skills install --claude

# Instalar skill específico
npx @tapi/skills install recargas --project
npx @tapi/skills install servicios --cursor

# Instalar múltiples skills
npx @tapi/skills install base recargas servicios --project

# Instalar todos los skills
npx @tapi/skills install --all --claude
```

### `list`

```bash
npx @tapi/skills list

# Output:
# Skills disponibles:
#   base          Contexto general de TAPI (auth, API structure, errors)
#   auth          Autenticación JWT, login, refresh de tokens
#   servicios     Pago de facturas y servicios públicos
#   agenda        Gestión de adhesiones y notificaciones
#   recargas      Recargas móviles y de datos
#   suscripciones Gift cards y suscripciones digitales
```

### `update`

```bash
npx @tapi/skills update

# Output:
# Actualizando skills...
#   .cursor/rules/tapi-base.mdc ✓ (v1.0.0 → v1.1.0)
#   .cursor/rules/tapi-recargas.mdc ✓ (sin cambios)
# Listo!
```

## Installers por Destino

### `--project` (genérico)
```
.tapi/
└── skills/
    ├── tapi-base.md
    ├── tapi-auth.md
    └── ...
```

### `--cursor`
```
.cursor/
└── rules/
    ├── tapi-base.mdc
    ├── tapi-auth.mdc
    └── ...
```
Cursor usa extensión `.mdc`.

### `--claude`
```
.claude/
└── skills/
    ├── tapi-base.md
    ├── tapi-auth.md
    └── ...
```

### `--windsurf`
```
.windsurf/
└── rules/
    ├── tapi-base.md
    ├── tapi-auth.md
    └── ...
```

### Comportamiento común
- Si el directorio no existe, lo crea
- Si el archivo ya existe, pregunta si sobrescribir (o usa `--force`)
- Agrega prefijo `tapi-` a todos los archivos para evitar colisiones

## Configuración del Paquete

### package.json
```json
{
  "name": "@tapi/skills",
  "version": "1.0.0",
  "description": "Install TAPI integration skills for AI coding assistants",
  "bin": {
    "tapi-skills": "./dist/cli.js"
  },
  "files": [
    "dist",
    "skills"
  ],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["tapi", "ai", "cursor", "claude", "windsurf", "skills"],
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "dependencies": {
    "commander": "^12.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src"]
}
```

## Flujo Interno del CLI

### Entry point (cli.ts)
```typescript
#!/usr/bin/env node
import { program } from 'commander';
import { install } from './commands/install';
import { update } from './commands/update';
import { list } from './commands/list';

program
  .name('tapi-skills')
  .description('Install TAPI skills for AI coding assistants')
  .version('1.0.0');

program
  .command('install [skills...]')
  .option('--project', 'Install to .tapi/skills/')
  .option('--cursor', 'Install to .cursor/rules/')
  .option('--claude', 'Install to .claude/skills/')
  .option('--windsurf', 'Install to .windsurf/rules/')
  .option('--all', 'Install all available skills')
  .option('--force', 'Overwrite existing files')
  .action(install);

program
  .command('list')
  .description('List available skills')
  .action(list);

program
  .command('update')
  .option('--force', 'Overwrite without confirmation')
  .action(update);

program.parse();
```

### Lógica de install
1. Validar que se especificó al menos un destino
2. Si no se especificaron skills, usar `base` por defecto
3. Si `--all`, cargar todos los skills disponibles
4. Para cada skill: leer el `.md` del paquete, escribirlo en el destino
5. Mostrar resumen de archivos creados

### Lógica de update
1. Buscar archivos `tapi-*.md` en todas las ubicaciones conocidas
2. Comparar con versión actual del paquete
3. Sobrescribir los que cambiaron

## Skills

### Lista de Skills

| Skill | Archivo | Propósito |
|-------|---------|-----------|
| `base` | `base.md` | Overview de TAPI, estructura de la API, manejo de errores general, URL base |
| `auth` | `auth.md` | Login, JWT, refresh de tokens, headers requeridos |
| `servicios` | `servicios.md` | Pago de facturas: empresas, consulta de deuda, confirmación de pagos |
| `agenda` | `agenda.md` | Gestión de adhesiones: alta, baja, modificación, notificaciones de clientes |
| `recargas` | `recargas.md` | Recargas móviles: providers, productos, ejecución, estados |
| `suscripciones` | `suscripciones.md` | Gift cards y suscripciones: catálogo, compra, entrega |

### Formato de cada Skill

```markdown
# TAPI [Dominio]

## Qué es
[Contexto de negocio: qué problema resuelve, para qué sirve]

## Conceptos clave
[Terminología del dominio: qué es una adhesión, qué es un servicio, etc.]

## Flujo
[Pasos a seguir para completar la operación]

## Endpoints
[Endpoints reales de la API con request/response correctos]

## Errores comunes
[Errores frecuentes y cómo manejarlos]
```

### Nivel de detalle
- **Skill base**: Contexto técnico esencial (overview rápido)
- **Skills específicos**: Flujos completos paso a paso, casos edge, validaciones (profundidad)

## Publicación

```bash
npm login
npm publish --access public
```

El paquete queda disponible como `@tapi/skills` en NPM.

## Próximos Pasos

1. Implementar el CLI (estructura, comandos, installers)
2. Crear contenido de skills con información real de tapila.dev/api-reference
3. Testing local con `npm link`
4. Publicar v1.0.0 en NPM
