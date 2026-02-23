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
3. Usar el token en el header `x-authorization-token` en las requests a otros servicios
4. El token dura aproximadamente **4.3 horas** (15,480 segundos segun JWT decode). Este TTL no esta documentado oficialmente y puede cambiar

`POST /login` es idempotente: no tiene side effects y es seguro reintentarlo ante timeouts.

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

## Contenido util del JWT

Decodificando el `accessToken` (es un JWT estandar) se pueden leer campos utiles sin llamar a TAPI:

- `exp`: timestamp de expiracion (usar para renovacion proactiva)
- `clientCompany`: nombre de la empresa del cliente
- `clientCountryCode`: codigo de pais (ej: `MX`, `AR`)

## Estrategia de Renovación

- El token dura aproximadamente **4.3 horas**
- Se puede llamar a `/login` tantas veces como sea necesario
- Recomendacion: Leer `exp` del JWT y renovar proactivamente antes de que expire
- Es valido usar un solo token hasta que expire, o generar varios en paralelo

### Patron recomendado: Interceptor HTTP

Implementar un interceptor/middleware HTTP que:

1. Detecte respuestas **401** de cualquier endpoint de TAPI
2. Ejecute un re-login automatico (`POST /login`)
3. Reintente la llamada original con el nuevo token

**EXCEPCION CRITICA**: Ante un 401 en `POST /payment`, **NUNCA** reintentar automaticamente el pago. Primero verificar con `GET /operation/{externalPaymentId}?type=external-payment-id` si el pago fue procesado. Si no existe (404), recien ahi es seguro reintentar.

### Circuit Breaker para Login

Si el login falla 3 veces consecutivas (sin ser por credenciales invalidas), implementar un circuit breaker: esperar un periodo creciente antes de reintentar para evitar saturar el servicio.

### Multiples instancias

Si la aplicacion corre en multiples replicas/instancias:
- Cada instancia puede obtener su propio token (mas simple)
- O compartir un unico token via un cache distribuido (Redis, Memcached) para reducir llamadas al login

## Errores Comunes

| HTTP | Código | Mensaje | Causa | Solución |
|------|--------|---------|-------|----------|
| 401 | ALO04140 | Username or password are incorrect | Credenciales inválidas | Verificar usuario y password |
| 403 | - | Forbidden | API Key incorrecta | Usar la API Key del servicio de Login |

## Flujo Detallado de Autenticacion

```
1. Obtener credenciales (clientUsername, password, x-api-key del Login)
   ↓
2. POST /login con credenciales + x-api-key del Login
   ↓
3. Recibir accessToken (JWT, ~4.3h de vida)
   ↓
4. Cachear el accessToken en el backend
   ↓
5. Usar accessToken en header x-authorization-token + x-api-key del servicio correspondiente
   ↓
6. Si cualquier endpoint responde 401 → re-login automatico (excepto POST /payment)
   ↓
7. Para POST /payment con 401 → verificar con GET /operation antes de reintentar
```

## Buenas Prácticas

- Nunca hardcodear credenciales, usar variables de entorno o servicios de secretos (AWS Secrets Manager, Vault, etc.)
- Cachear el token, no pedir uno nuevo por cada request
- Renovar el token proactivamente leyendo `exp` del JWT, o reactivamente al recibir 401
- Usar credenciales de Sandbox para desarrollo y pruebas
- Recordar que cada país requiere sus propias credenciales
- Implementar circuit breaker para login fallido

## Preguntas Frecuentes (FAQs)

**El refreshToken esta funcional?**
No. La respuesta incluye un `refreshToken` pero actualmente no se utiliza. El endpoint `/refresh` responde 403. Cuando el accessToken expire, realizar un nuevo `POST /login`.

**Puedo generar multiples tokens simultaneos?**
Si. Cada llamada a `POST /login` genera un nuevo token sin invalidar los anteriores. Util para arquitecturas con multiples instancias.

**Las credenciales son por pais o globales?**
Son unicas por cliente Y por pais. Si operas en Mexico y Argentina, tendras `clientUsername`, `password` y `x-api-key` distintos para cada pais.

**Cual es la diferencia entre x-api-key y accessToken?**
Son dos niveles de autenticacion: `x-api-key` es estatica, identifica a la aplicacion y al microservicio. `accessToken` (JWT) es dinamico, identifica la sesion autenticada y tiene expiracion.

**Que pasa si mi token expira a mitad de un flujo de pago?**
Tu interceptor HTTP detecta el 401, ejecuta re-login, y reintenta la llamada original. **Excepcion critica**: NUNCA reintentar automaticamente un `POST /payment`. Verificar con `GET /operation` primero.

**Debo hacer login cada vez que el usuario abre la app?**
No. El token dura ~4.3 horas. El backend debe cachearlo y reutilizarlo. Solo hacer nuevo login cuando expire o al reiniciar el servicio.

**Puedo decodificar el JWT para leer la fecha de expiracion?**
Si. El JWT contiene el campo `exp` (Unix timestamp). Se puede usar para renovacion proactiva (renovar unos minutos antes de que expire).

**El login tiene rate limiting?**
No esta documentado oficialmente. Un patron saludable es: 1 login al iniciar + re-login reactivo cada ~4 horas. Evitar hacer login en cada request.

**Que significan tx y mainTx en la respuesta?**
Son UUIDs de trazabilidad interna de TAPI. `tx` identifica el paso especifico y `mainTx` la transaccion general. Registrarlos siempre en logs para soporte.

## Skills Relacionados

- `base` - Contexto general de TAPI
- `servicios` - Pago de facturas (requiere autenticación)
- `agenda` - Gestión de adhesiones (requiere autenticación)
- `recargas` - Recargas móviles (requiere autenticación)
