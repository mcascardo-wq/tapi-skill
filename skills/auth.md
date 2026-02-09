# TAPI Auth

## Qué es

El módulo de autenticación permite obtener tokens JWT para acceder a las APIs de TAPI. Todas las operaciones requieren un token válido.

## Credenciales

- **Componentes**: Cada cliente recibe un `clientUsername` y `password`
- **Por país**: Las credenciales son únicas por país. Si operás en Argentina y Perú, necesitás credenciales separadas para cada uno
- **Por ambiente**: Existen credenciales separadas para Sandbox (desarrollo) y Producción
- **Entrega de producción**: Las credenciales productivas se envían por un link seguro de único uso al email del cliente

## Ambientes

| Ambiente | URL Base Login |
|----------|----------------|
| Sandbox | `https://login.homo.tapila.cloud` |
| Producción | `https://login.tapila.cloud` |

## API Keys

**Importante**: Cada servicio de TAPI tiene su propia API Key. No uses la API Key del Login para otros servicios.

| Servicio | Uso |
|----------|-----|
| Login | Solo para autenticarse |
| Service | Pago de servicios |
| Recharge | Recargas móviles |
| Agenda | Gestión de adhesiones |
| Company | Datos de la empresa |
| Tools | Utilidades |

## Flujo de Autenticación

1. Hacer POST a `/login` con credenciales y header `x-api-key`
2. Guardar el `accessToken` de la respuesta
3. Usar el token en el header `X-Authorization-Token` en las requests a otros servicios
4. El token dura **4 horas**. Renovar antes de que expire

## Endpoint

### POST /login

**URL Sandbox:**
```
https://login.homo.tapila.cloud/login
```

**URL Producción:**
```
https://login.tapila.cloud/login
```

**Headers:**
```
x-api-key: {apiKeyDelLogin}
Content-Type: application/json
```

**Request:**
```json
{
  "clientUsername": "mi-usuario.homo",
  "password": "mi-password-seguro"
}
```

**Response 200 OK:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tx": "c66962b7-f810-4e51-9fc8-9d372e0e8192",
  "mainTx": "663e78ac-8ab3-44a4-821a-bf49a7972d78"
}
```

**Nota**: El `refreshToken` no se utiliza actualmente. Ignorarlo en la lógica de integración.

**Response 401 Unauthorized:**
```json
{
  "message": "Username or password are incorrect.",
  "code": "ALO04140"
}
```

### Ejemplo cURL

```bash
curl --location 'https://login.homo.tapila.cloud/login' \
--header 'x-api-key: {{api-key-del-login}}' \
--header 'Content-Type: application/json' \
--data '{
  "clientUsername": "{{clientUsername}}",
  "password": "{{password}}"
}'
```

## Uso del Token en Otros Servicios

Una vez obtenido el `accessToken`, usarlo en las requests a otros servicios:

```
X-Authorization-Token: {accessToken}
x-api-key: {apiKeyDelServicio}
```

**Importante**: La `x-api-key` debe ser la del servicio que estás consumiendo (Service, Recharge, etc.), NO la del Login.

## Estrategia de Renovación

- El token dura **4 horas**
- Se puede llamar a `/login` tantas veces como sea necesario
- Recomendación: Renovar el token antes de las 4 horas
- Es válido usar un solo token hasta que expire, o generar varios en paralelo

## Errores Comunes

| HTTP | Código | Mensaje | Causa | Solución |
|------|--------|---------|-------|----------|
| 401 | ALO04140 | Username or password are incorrect | Credenciales inválidas | Verificar usuario y password |
| 403 | - | Forbidden | API Key incorrecta | Usar la API Key del servicio de Login |

## Buenas Prácticas

- Nunca hardcodear credenciales, usar variables de entorno
- Cachear el token, no pedir uno nuevo por cada request
- Renovar el token proactivamente antes de las 4 horas
- Usar credenciales de Sandbox para desarrollo y pruebas
- Recordar que cada país requiere sus propias credenciales

## Skills Relacionados

- `base` - Contexto general de TAPI
- `servicios` - Pago de facturas (requiere autenticación)
- `agenda` - Gestión de adhesiones (requiere autenticación)
- `recargas` - Recargas móviles (requiere autenticación)
