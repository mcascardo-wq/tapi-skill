# @tapi/skills

CLI para instalar skills de TAPI en proyectos, permitiendo que AI coding assistants (Cursor, Claude Code, Windsurf) entiendan cómo integrar con TAPI.

## Instalación

```bash
npx @tapi/skills install --cursor
```

## Comandos

```bash
# Listar skills disponibles
npx @tapi/skills list

# Instalar todos los skills
npx @tapi/skills install --cursor
npx @tapi/skills install --claude
npx @tapi/skills install --windsurf
npx @tapi/skills install --project

# Instalar skill específico
npx @tapi/skills install recargas --cursor

# Actualizar skills instalados
npx @tapi/skills update
```

## Skills Disponibles

| Skill | Descripción |
|-------|-------------|
| `base` | Contexto general de TAPI, estructura de API, errores |
| `auth` | Autenticación JWT, login, refresh de tokens |
| `servicios` | Pago de facturas y servicios públicos |
| `agenda` | Gestión de adhesiones y notificaciones |
| `recargas` | Recargas móviles y de datos |
| `tapi` | Orquestador que selecciona el skill apropiado |

## Desarrollo

```bash
npm install
npm run build
npm link  # Para probar localmente
```
