# TAPI Base

## Qué es TAPI

TAPI es una infraestructura de pagos para Latinoamérica que permite integrar pagos de servicios y recargas móviles en cualquier plataforma digital.

## URL Base

```
https://api.tapila.cloud
```

## Estructura de la API

La API está organizada en los siguientes dominios:

- **Auth**: Autenticación y manejo de tokens
- **Servicios**: Pago de facturas y servicios públicos
- **Agenda**: Gestión de adhesiones y notificaciones
- **Recargas**: Recargas móviles y de datos

## Headers Requeridos

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

## Manejo de Errores

| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Parámetros inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos para esta operación |
| 404 | Not Found - Recurso no encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error |

## Rate Limiting

La API tiene límites de rate limiting estándar. Respeta los headers `X-RateLimit-*` en las respuestas.

## Skills Relacionados

- `auth` - Autenticación y tokens
- `servicios` - Pago de facturas
- `agenda` - Gestión de adhesiones
- `recargas` - Recargas móviles
