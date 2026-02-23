# TAPI Base

## Qué es TAPI

TAPI es una infraestructura de pagos para Latinoamérica que permite integrar pagos de servicios y recargas móviles en cualquier plataforma digital.

## URLs Base por Servicio

Cada servicio de TAPI tiene su propia URL base:

| Servicio | Sandbox | Produccion |
|----------|---------|------------|
| Login | `https://login.homo.tapila.cloud` | `https://login.tapila.cloud` |
| Companies (Catalogo) | `https://companies.homo.tapila.cloud` | `https://companies.tapila.cloud` |
| Services (Pago de servicios) | `https://services.homo.tapila.cloud` | `https://services.tapila.cloud` |
| Recharge (Recargas) | `https://recharge.homo.tapila.cloud` | `https://recharge.tapila.cloud` |
| Agenda (Adhesiones y recordatorios) | `https://agenda.homo.tapila.cloud` | `https://agenda.tapila.cloud` |
| Tools (Utilidades sandbox) | `https://tools.homo.tapila.cloud` | Solo disponible en sandbox |

## Estructura de la API

La API está organizada en los siguientes dominios:

- **Auth**: Autenticación y manejo de tokens
- **Companies**: Catálogo de empresas disponibles (primer paso del flujo)
- **Servicios**: Pago de facturas y servicios públicos
- **Agenda**: Gestión de adhesiones, notificaciones y débito automático
- **Recargas**: Recargas móviles y de datos

## Headers Requeridos

```
x-authorization-token: {accessToken}
x-api-key: {apiKeyDelServicio}
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

## Configuracion de Webhooks

TAPI utiliza webhooks para notificar eventos (confirmacion de pagos, adhesiones, recordatorios). Para configurarlos:

1. **Informar al equipo de integraciones** el endpoint donde queres recibir los webhooks
2. **Opcionalmente**, podes configurar seguridad:
   - **API Key**: TAPI enviara un header con tu API key en cada llamada al webhook
   - **Encriptacion**: Proporcionando tu public key, el payload se encripta

Se pueden configurar **URLs diferentes por modulo** (servicios, recargas, agenda). Informar las URLs deseadas al equipo de integraciones.

La configuracion de webhooks se realiza durante el proceso de integracion con el equipo de TAPI.

### Politica de Reintentos de Webhooks

Si TAPI no recibe un HTTP 200 del endpoint del cliente, **reintenta hasta 3 veces**. Implementar idempotencia en el handler para manejar posibles duplicados por reintentos.

### Testing de Webhooks en Sandbox

Los webhooks se pueden probar en sandbox utilizando los casos incluidos en el **set de datos de prueba** entregado por el equipo de integraciones. Al ejecutar pagos con esos datos de prueba, TAPI dispara los webhooks correspondientes al endpoint configurado.

## Idempotencia

Los endpoints de pago son idempotentes por `externalPaymentId`. Si envias un pago con un `externalPaymentId` que ya fue procesado, TAPI rechazara la solicitud indicando que ese ID ya fue utilizado. Esto protege contra cobros duplicados por reintentos.

## Reversiones

TAPI **no soporta reversiones ni cancelaciones** de pagos una vez procesados, ni para servicios ni para recargas. Si ocurre un problema post-pago (cobro duplicado, error del biller, etc.), contactar al **equipo de operaciones** de TAPI para gestionar la resolucion del caso.

## Politica de Reintentos

| Operacion | Reintentar? | Detalle |
|-----------|-------------|---------|
| POST /login | Si | Idempotente, sin side effects. Seguro reintentar con backoff |
| POST /debts | Si | Idempotente por naturaleza (solo consulta) |
| POST /payment | **NUNCA automaticamente** | Primero consultar `GET /operation/{externalPaymentId}?type=external-payment-id`. Si 404 (no existe), seguro reintentar. Si existe, verificar status |
| GET /operation | Si | Solo lectura, seguro reintentar |
| Errores 4xx | No | Errores de negocio, no se resuelven reintentando |
| Errores 5xx | Con precaucion | Verificar con GET /operation antes de reintentar pagos |

TAPI tiene su propia logica de reintentos interna que optimiza el flujo con los billers. Reintentar pagos del lado del cliente puede generar cobros duplicados.

## Experiencia de Usuario Recomendada para Pagos

1. **Pantalla de procesando** (blanca): Mostrar durante los primeros **15 segundos** mientras se espera la confirmacion via webhook
2. **Si no llega en 15 segundos**, mostrar una pantalla de **"pago en proceso"** (estado intermedio) informando que el pago esta siendo procesado
3. **Confirmacion final**: Notificar al usuario via push notification o email cuando llegue la confirmacion por webhook o al consultar `GET /operation/{operationId}`

## Polling como Respaldo al Webhook

Si el webhook no llega, usar `GET /operation/{operationId}` como respaldo con backoff exponencial:

| Intento | Espera |
|---------|--------|
| 1 | 30 segundos |
| 2 | 30 segundos |
| 3 | 60 segundos |
| 4 | 120 segundos |
| 5 | 180 segundos |
| 6+ | 300 segundos |

**Timeout final**: 30 minutos. Si despues de 30 minutos no hay confirmacion, alertar al equipo de operaciones.

**Idempotencia del receptor**: El webhook puede llegar mas de una vez. Implementar idempotencia en el handler (verificar por `operationId` si ya fue procesado).

## Conciliacion Diaria

TAPI envia diariamente un archivo de conciliacion por **SFTP** con el detalle de todas las operaciones del dia. Para configurarlo:

1. Enviar una **public key SSH** al equipo de integraciones para acceder al servidor SFTP
2. La configuracion se realiza por separado para cada ambiente (Sandbox y Produccion)
3. Cada ambiente tiene su propio servidor SFTP y requiere su propia public key

Contactar al equipo de integraciones para coordinar la configuracion y el formato del archivo.

## Formatos de Datos

| Campo | Formato | Ejemplo |
|-------|---------|---------|
| Fechas (datetime) | ISO 8601 UTC | `2026-02-13T22:46:14.285Z` |
| Fechas (date) | ISO 8601 | `2026-03-15` |
| UUIDs | UUID v4 | `d8124398-fd5d-4050-a693-85811ef27b66` |
| Moneda | ISO 4217 | `MXN`, `ARS`, `USD` |
| Montos | Number, 2 decimales | `5000.50` |
| companyCode servicios | `{PAIS}-S-{NUMERO}` | `MX-S-00182` |
| companyCode recargas | `{PAIS}-R-{NUMERO}` | `MX-R-90006` |
| debtId | `{operationId}-{N}` | `uuid-0`, `uuid-1` |

Usar precision de 2 decimales y tipos como `BigDecimal` (nunca `float`) para montos.

## Trazabilidad (tx / mainTx)

Todas las respuestas de TAPI incluyen dos campos de trazabilidad:

- **`tx`**: ID del paso especifico dentro de la transaccion
- **`mainTx`**: ID de la transaccion principal que agrupa todos los pasos

Registrarlos siempre en los logs. Son utiles al comunicarse con el equipo de soporte de TAPI para debugging.

## Sandbox y Datos de Prueba

- Las credenciales de Sandbox se entregan durante el proceso de integracion
- TAPI provee un **set de datos de prueba** (companyCodes, identificadores, numeros de telefono) para testear todos los flujos
- Los datos de prueba son entregados por el equipo de integraciones al iniciar la integracion

## Diferencias Sandbox vs Produccion

| Aspecto | Sandbox | Produccion |
|---------|---------|------------|
| URLs | `*.homo.tapila.cloud` | `*.tapila.cloud` |
| API keys | Diferentes por ambiente | Diferentes por ambiente |
| Credenciales | Provistas para testing | Provistas en go-live |
| Pagos de servicios | Se confirman inmediatamente (no llega webhook) | Asincronos, esperar webhook o polling |
| Pagos de recargas | Sincronicos (igual que produccion) | Sincronicos (~98%), excepcionalmente 202 |
| Notificaciones de agenda | NO se generan automaticamente. Usar `POST /agenda/adhesions/reprocess` en Tools con `forceNotification: true` | Se generan automaticamente |
| Microservicio Tools | Disponible | NO existe en produccion |

## Proceso de Homologacion

Antes de salir a produccion, TAPI realiza un proceso de homologacion:

1. Se recorre el **frontend del cliente** junto con el equipo de TAPI
2. Se prueba con el **set de datos** cubriendo la mayoria de los casos (diferentes modalidades, tipos de monto, errores)
3. Se valida el comportamiento correcto del flujo completo (consulta, pago, confirmacion, errores)

La homologacion es un requisito para obtener las credenciales productivas.

## Fondeo de Wallet

El fondeo de la wallet (dinero prefondeado para operar) se gestiona con el **equipo de operaciones** de TAPI. Contactar al equipo para coordinar la carga de saldo.

- **Saldo por pais**: `POST /wallet/balance` responde el saldo desglosado por pais
- **Alertas de saldo bajo**: TAPI puede enviar alertas por **Slack** cuando el saldo esta por debajo de un umbral. Contactar al equipo de operaciones para configurar el canal de Slack y el threshold deseado

## Skills Relacionados

- `auth` - Autenticación y tokens
- `companies` - Catálogo de empresas
- `servicios` - Pago de facturas
- `agenda` - Gestión de adhesiones
- `recargas` - Recargas móviles
