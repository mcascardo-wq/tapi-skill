# TAPI Auth

## Qué es

El módulo de autenticación permite obtener tokens JWT para acceder a la API de TAPI. Todas las operaciones requieren un token válido. Las credenciales son únicas por cada cliente de TAPI y por cada país en el que opera.

## Conceptos Clave

- **Access Token**: Token JWT que autoriza las requests. Se usa en el header `x-authorization-token`.
- **Refresh Token**: Disponible en la API pero no se utiliza actualmente.
- **API Key**: Header `x-api-key` requerido junto con el token en todos los endpoints.
- **Credenciales**: `clientUsername` y `password` provistos por TAPI.

## Flujo de Autenticación

1. Hacer POST a `/login` con credenciales y header `x-api-key`
2. Guardar el `accessToken` de la respuesta
3. Usar el token en el header `x-authorization-token` de todas las requests
4. Si el token se vence, generar uno nuevo llamando a `/login` nuevamente

## Endpoint

### POST /login

**Headers:**
- `x-api-key`: API key provista por TAPI

**Request:**
```json
{
  "clientUsername": "john.doe",
  "password": "My.pass.12345678"
}
```

**Response 200 OK:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tx": "79475fd4-9e87-47ea-a770-84fa60c62ffb",
  "main_tx": "4f3dda83-f130-44ac-b692-0fec50dddd76"
}
```

**Response 400 Bad Request:**
```json
{
  "message": "Incorrect username or password.",
  "code": "LTL01"
}
```

## Headers Requeridos en Otros Endpoints

Después de autenticarse, todos los endpoints requieren:

```
x-authorization-token: {accessToken}
x-api-key: {apiKey}
```

## Errores Comunes

| Error | Código | Causa | Solución |
|-------|--------|-------|----------|
| 400 Bad Request | LTL01 | Usuario no existe o contraseña incorrecta | Verificar credenciales |

## Buenas Prácticas

- Nunca hardcodear credenciales, usar variables de entorno
- Es posible generar múltiples tokens si es necesario
- Cachear el token, no pedir uno nuevo por cada request
- Si el token se vence, simplemente llamar a `/login` de nuevo

## Skills Relacionados

- [[base]] - Contexto general de TAPI
- [[servicios]] - Pago de facturas (requiere autenticación)
- [[agenda]] - Gestión de adhesiones (requiere autenticación)
