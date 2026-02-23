# TAPI Servicios

## Que es

Permite a tus usuarios pagar facturas de servicios publicos (luz, agua, gas, internet, impuestos, etc.) desde tu plataforma. TAPI se conecta con las empresas prestadoras para consultar deudas y procesar pagos en tiempo real.

## Conceptos Clave

- **Empresa (Company)**: El prestador del servicio (ej: Edenor, Telecentro, AYSA). Identificada por `companyCode`
- **Modalidad**: Forma de identificar la deuda (codigo de barras, ingreso manual, QR). Cada empresa puede tener multiples modalidades
- **Codigo de pago**: Identificador unico de la factura o cliente (varia por empresa y modalidad)
- **Deuda (Debt)**: Monto pendiente de pago consultado en tiempo real. Puede ser monto abierto o cerrado
- **operationId**: ID unico de la operacion, usado para trazabilidad

## Flujo de Pago

1. **Listar empresas** - GET /services - Obtener catalogo de empresas disponibles
2. **Consultar deuda** - POST /debts - Con el codigo de pago, obtener deuda actual
3. **Procesar pago** - POST /payment - Ejecutar el pago de la deuda
4. **Recibir confirmacion** - Webhook confirmPayment - TAPI notifica el resultado final
5. **Verificar estado** - GET /operation/{operationId} - Consultar estado en cualquier momento

## URLs Base

| Ambiente | URL |
|----------|-----|
| Sandbox | `https://services.homo.tapila.cloud` |
| Produccion | `https://services.tapila.cloud` |

## Endpoints

### GET /services

Obtiene el listado de empresas de servicios activas. Paginado (5000 por pagina por defecto).

**Headers:**
- `x-authorization-token`: Token JWT obtenido del login
- `x-api-key`: API key del servicio de Services

**Query Params (opcionales):**
- `active`: Flag para empresas activas (default: true)
- `searchCompany`: Filtrar por nombre (minimo 3 caracteres)
- `tag_id`: Filtrar por categoria
- `limit`: Cantidad de empresas por pagina
- `page`: Numero de pagina

**Response 200 OK:**
```json
{
  "services": [
    {
      "companyCode": "MX-S-90227",
      "companyName": "Movistar Pospago",
      "companyType": "SERVICE",
      "companyLogo": "https://public-logo.prod.tapila.cloud/mx/Movistar.png",
      "tags": ["INTERNET, TELEFONIA Y TV"],
      "active": true,
      "modalities": [
        {
          "modalityId": "01e1ddac-fdcc-42be-a05c-933acbfa70eb",
          "modalityType": "input",
          "modalityTitle": "Movistar Pospago pago por ingreso manual",
          "modalityDescription": "Pago",
          "active": true,
          "isSchedulable": true,
          "status": "live",
          "queryData": [
            {
              "inline": false,
              "dataType": "NUM",
              "helpText": "Ingresar numero de telefono",
              "position": 0,
              "component": "TEXT_FIELD",
              "maxLength": 10,
              "minLength": 10,
              "description": "Numero de telefono",
              "identifierName": "BAZB-REF",
              "identifierValue": null
            }
          ]
        }
      ]
    }
  ],
  "links": [
    {
      "rel": "next",
      "title": "Next interval",
      "href": "?page=2&limit=50"
    }
  ],
  "tx": "...",
  "mainTx": "..."
}
```

### GET /{companyCode}

Obtiene detalle de una empresa especifica.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Path Params:**
- `companyCode`: Codigo de la empresa (ej: "MX-S-90227")

### GET /tags

Obtiene todas las categorias disponibles.

**Response:**
```json
{
  "tags": [
    { "id": 168, "name": "SERVICIO DE AGUA" },
    { "id": 175, "name": "TV POR CABLE" }
  ]
}
```

### GET /services/popular

Obtiene las empresas mas transaccionales por categoria.

---

### POST /debts

Consulta las facturas pendientes de pago para una empresa.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Request:**
```json
{
  "companyCode": "MX-S-00008",
  "modalityId": "4e27b7c4-56c0-44b5-95a5-59d5d043ff0a",
  "queryData": [
    {
      "identifierName": "reference",
      "identifierValue": "8441368835"
    }
  ],
  "externalRequestId": "uuid-generado-por-cliente",
  "externalClientId": "identificador-usuario-final"
}
```

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| companyCode | String | Si | Codigo de compania |
| modalityId | String | Si | ID de modalidad (del endpoint /services) |
| queryData | Object[] | Si | Identificador de la factura |
| externalRequestId | String | Si | ID de consulta del cliente |
| externalClientId | String | Si | ID del usuario final (usado para Recordatorios) |

**Response 200 OK:**
```json
{
  "operationId": "222ba02e-b7a2-40d4-b2cb-3445bf4ba2f3",
  "companyCode": "MX-S-00008",
  "companyName": "TELMEX",
  "customerId": "",
  "customerName": "",
  "customerAddress": "",
  "debts": [
    {
      "debtId": "222ba02e-b7a2-40d4-b2cb-3445bf4ba2f3-0",
      "currency": "MXN",
      "amount": 851,
      "minAmount": 11,
      "maxAmount": 851,
      "expirationDate": null,
      "amountType": "OPEN",
      "expired": false,
      "details": [{ "commission": 10 }],
      "expirations": [],
      "exchangeDetail": [
        {
          "amount": 50.06,
          "currency": "USD",
          "exchangeRate": 17
        }
      ]
    }
  ],
  "tx": "...",
  "mainTx": "..."
}
```

**Campos importantes de debts[]:**
- `debtId`: ID para usar en el pago
- `amount`: Monto de la factura. **Para `amountType: "OPEN"`, el `amount` es 0** porque el biller no informa un monto fijo; el usuario elige cuanto pagar dentro del rango `[minAmount, maxAmount]`
- `minAmount` / `maxAmount`: Rango permitido de pago
- `amountType`: "OPEN" (monto abierto, el usuario elige el monto) o "CLOSED" (monto fijo, no editable)
- `expired`: true si la factura ya no se puede pagar

---

### POST /payment

Procesa el pago de una deuda.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Request:**
```json
{
  "debtId": "ef8c7f8a-cbab-4c6d-ab57-2c3261a77f26-0",
  "amount": 741,
  "paymentMethod": "ACCOUNT",
  "externalPaymentId": "40d57dd9-6bf5-44d7-9ef7-f36d8422ab3c"
}
```

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| debtId | String | Si | ID de deuda del endpoint /debts |
| amount | Number | Si | Monto a pagar |
| paymentMethod | String | Si | DEBIT, ACCOUNT o CREDIT |
| externalPaymentId | String | Si | ID propio del cliente para trazabilidad |

**Response 200 OK:**
```json
{
  "operationId": "ef8c7f8a-cbab-4c6d-ab57-2c3261a77f26",
  "companyCode": "AR-S-0003",
  "companyName": "EDENOR",
  "externalPaymentId": "87b4d166-fde4-47cb-8375-44cb4333fd83",
  "externalClientId": "6936197a-cc5b-4545-b842-bc9e6984a274",
  "status": "processing",
  "createdAt": "2022-07-15T13:16:20.463Z",
  "amount": 741,
  "paymentMethod": "ACCOUNT",
  "agent": "TAPI",
  "clientUsername": "tapi",
  "identifiers": [
    {
      "identifierName": "barcode",
      "identifierValue": "635001748880853..."
    }
  ],
  "tx": "...",
  "mainTx": "..."
}
```

**Estados posibles de status:**
- `processing`: Pago en proceso
- `confirmed`: Pago confirmado exitosamente
- `failed`: Pago fallido

**Importante**: En servicios, `POST /payment` **siempre responde con HTTP 202** y status `processing`. El resultado final llega por webhook o se consulta con `GET /operation/{operationId}`.

---

### Webhook confirmPayment

TAPI envia la confirmacion del pago al endpoint configurado del cliente. El webhook se configura informando la URL al equipo de integraciones de TAPI (ver skill **Base** para detalle).

El campo `hash` permite validar la autenticidad del webhook si se tiene configurado un metodo de seguridad (API key o encriptacion con public key). Si no se configuro seguridad, el campo puede ignorarse.

**Request que TAPI envia:**
```json
{
  "operationId": "03eada39-723e-4682-a822-9c2db290b534",
  "status": "confirmed",
  "externalPaymentId": "20905777",
  "externalClientId": "hAv0jzHRRRH8EwnymqopIWwb",
  "additionalData": {
    "providerOperationId": "650cbf33bd8e9d422a3a05d4",
    "operationNumber": "202193273943440",
    "securityCode": "..."
  },
  "companyCode": "AR-S-00885",
  "companyName": "EDESUR",
  "amount": 21504.75,
  "hash": null,
  "type": "SERVICE"
}
```

**Response esperada del cliente:**
```json
{
  "status": "Confirm"
}
```

---

### GET /operation/{operationId}

Consulta el estado de una operacion de pago. Cumple tres funciones criticas:

1. **Confirmacion de pagos**: Verificar que un pago alcanzo `confirmed` y obtener el comprobante (ticket)
2. **Respaldo al webhook**: Cuando el webhook no llega, permite verificar el estado via polling
3. **Reconciliacion**: Consultar operaciones historicas para conciliacion diaria

**Importante**: Este endpoint existe en el microservicio de **Services** (`services.homo.tapila.cloud`). Un `operationId` de servicios no se encontrara si se consulta en el microservicio de recargas, y viceversa.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Response 200 OK:**
```json
{
  "operationId": "f7872991-be03-49ae-ba0e-567d0dffd6ac",
  "status": "confirmed",
  "externalPaymentId": "5aaa723b-0ae4-4c10-b7b1-9de9e8dfe697",
  "externalClientId": "19e06ddf-987e-4589-919a-9f62e9886e03",
  "companyCode": "AR-S-0003",
  "companyName": "EDENOR",
  "amount": 100,
  "createdAt": "2022-06-30T20:58:29.304Z",
  "additionalData": {
    "agent": "Agente Oficial TAPI",
    "customerId": "uuid-del-cliente",
    "ticket": [
      "================================",
      "COMPROBANTE DE PAGO",
      "Empresa: EDENOR",
      "Monto: $100.00",
      "================================"
    ],
    "providerName": "TAPI"
  }
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| operationId | String | ID unico de la operacion |
| status | String | `processing`, `confirmed` o `failed` |
| externalPaymentId | String | ID del pago asignado por el cliente |
| externalClientId | String | Identificador del usuario final |
| companyCode | String | Codigo de la empresa |
| companyName | String | Nombre de la empresa |
| amount | Number | Monto del pago |
| createdAt | String | Fecha y hora UTC (ISO 8601) |
| additionalData.ticket | String[] | Comprobante de pago linea por linea (renderizar con fuente monoespaciada) |
| additionalData.agent | String | Nombre del agente procesador |

**Estados posibles:**

| Status | Significado | Es final? |
|--------|-------------|-----------|
| `processing` | Pago en proceso, esperando confirmacion del biller | No |
| `confirmed` | Pago exitoso, acreditado | Si |
| `failed` | Pago rechazado o fallido | Si |

**Busqueda por externalPaymentId:**
```
GET /operation/{externalPaymentId}?type=external-payment-id
```

Usar exactamente `external-payment-id` (minusculas con guiones).

**Cuando usar cada identificador:**

| Situacion | Usar |
|-----------|------|
| Tienes el operationId almacenado | `GET /operation/{operationId}` |
| Solo tienes tu propio ID de pago | `GET /operation/{externalPaymentId}?type=external-payment-id` |
| Reconciliacion desde tu BD | `externalPaymentId` (tu BD indexa por tu propio ID) |
| Soporte con TAPI | `operationId` (TAPI trabaja internamente con este ID) |

**Estrategia de polling (respaldo al webhook):**

Si el webhook no llega despues de `POST /payment`, iniciar polling con backoff exponencial (ver seccion de Polling en skill **Base**): 30s, 30s, 60s, 120s, 180s, 300s. Timeout final: 30 minutos.

**Cacheabilidad:**

| Estado | Cacheable? |
|--------|-----------|
| `processing` | No (puede cambiar en cualquier momento) |
| `confirmed` | Si (estado final, inmutable) |
| `failed` | Si (estado final, inmutable) |

## Tipos de Modalidad

| modalityType | Descripcion |
|--------------|-------------|
| input | Ingreso manual (numero de cliente, etc.) |
| barcode | Codigo de barras de la factura |
| qr | Codigo QR (disponible solo en Argentina en produccion) |
| image | Imagen de la factura |

## Tipos de Datos (dataType)

| Codigo | Descripcion |
|--------|-------------|
| ALF | Alfanumerico |
| NUM | Numerico |
| FEC | Fecha |
| IMP | Importe |
| CBA | Codigo de barras |

## Lifecycle del debtId

Cada llamada a `POST /debts` genera un `debtId` nuevo, incluso para la misma deuda:

1. Cada `debtId` tiene un tiempo de vida limitado
2. Los `debtId` de consultas anteriores **expiran y no son reutilizables**
3. Para pagar, siempre obtener un `debtId` fresco con `POST /debts` inmediatamente antes del pago
4. El formato del `debtId` es `{operationId}-{N}` donde N es el indice de la deuda (empezando en 0)

## externalRequestId

El campo `externalRequestId` es **obligatorio** en `POST /debts`. Debe ser un UUID v4 unico por cada consulta de deuda. Sirve para:
- Trazabilidad de consultas en los logs de TAPI
- Correlacion entre la consulta del cliente y la respuesta de TAPI

## Comportamiento en Sandbox

En el ambiente de Sandbox, los pagos de servicios se **confirman inmediatamente** (el status pasa a `confirmed` sin delay). El webhook `confirmPayment` puede no llegar en sandbox. En produccion, el flujo siempre es asincrono (HTTP 202 → esperar webhook o polling).

## Casos Edge

- **Sin deuda**: La consulta puede retornar `debts: []` si no hay deuda pendiente
- **Factura vencida**: `expired: true` indica que ya no se puede pagar
- **Pago parcial**: Solo si `amountType: "OPEN"` y `minAmount < amount`. Si el usuario paga parcialmente, la deuda se actualiza en el biller. La proxima consulta a `POST /debts` reflejara el saldo actualizado
- **Pago por otro canal**: Si el usuario pago la deuda por otro canal (banco, cajero, etc.) y ese canal actualizo la deuda en el biller, al consultar `POST /debts` en TAPI se reflejara el estado actualizado. Si la deuda fue pagada en su totalidad, la consulta retornara `debts: []` o el error `SDE04342` (no se encontro deuda)
- **Monto abierto (OPEN) con amount=0**: Comportamiento esperado. Las deudas con `amountType: "OPEN"` devuelven `amount: 0` porque el biller no informa un monto fijo. El usuario elige cuanto pagar dentro del rango `[minAmount, maxAmount]`. No mostrar `$0` al usuario
- **Timeout**: Siempre verificar estado final con GET /operation despues de pagar
- **Codigo invalido**: Validar formato segun `minLength`/`maxLength` antes de consultar
- **debtId expirado**: Si el pago falla con SPA04345, obtener un debtId fresco con POST /debts

## Errores

### Errores de POST /debts (Consulta de deuda)

| HTTP | Codigo | Mensaje | Causa | Solucion |
|------|--------|---------|-------|----------|
| 400 | SDE04022 | Campo obligatorio faltante | Falta un campo requerido en el body | Verificar que todos los campos esten presentes |
| 404 | SDE04342 | No se encontro deuda | No hay deuda pendiente para ese identificador | Informar al usuario que no tiene deuda |
| 400 | SDE04343 | Identificador invalido | El valor del identificador no es valido para la empresa | Verificar formato segun `minLength`/`maxLength` y `dataType` de la modalidad |
| 500 | SDE05070 | Error del proveedor | El biller respondio con error | Reintentar mas tarde, el proveedor puede estar caido |
| 409 | SDE44389 | Deuda ya pagada | La deuda consultada ya fue abonada | Informar al usuario |
| 410 | SDE04646 | Deuda vencida | La deuda ya expiro | Informar al usuario que la deuda esta vencida |
| 500 | XCX05060 | Error interno | Error interno de TAPI | Reintentar mas tarde |

### Errores de POST /payment (Pago)

| HTTP | Codigo | Mensaje | Causa | Solucion |
|------|--------|---------|-------|----------|
| 400 | SPA04023 | Falta externalPaymentId | No se incluyo el campo `externalPaymentId` | Agregar un UUID v4 unico como `externalPaymentId` |
| 400 | SPA04041 | Monto fuera de rango | El monto esta por debajo de `minAmount` o por encima de `maxAmount` | Validar rango antes de enviar |
| 404 | SPA04345 | debtId no encontrado o expirado | El `debtId` no existe o ya expiro | Obtener un `debtId` fresco con `POST /debts` |
| 409 | SPA04649 | Pago duplicado | Ya existe un pago con ese `externalPaymentId` | No reintentar; verificar estado con `GET /operation` |
| 500 | SPR05091 | Error del proveedor | Error al procesar con el biller | Verificar con `GET /operation` antes de reintentar |

## isSchedulable y Agenda

El campo `isSchedulable` en cada modalidad indica si soporta adhesiones en la agenda:
- **`true`**: Se pueden guardar adhesiones y generar notificaciones de nuevos vencimientos
- **`false`**: No soporta agenda (el identificador cambia cada periodo o el biller no devuelve saldo)

Solo las modalidades con `isSchedulable: true` deben ofrecerse para adherirse a recordatorios. Ver skill de **Agenda** para mas detalle.

## Idempotencia

Si se envia un `POST /payment` con un `externalPaymentId` ya utilizado, TAPI rechazara la solicitud indicando que ese ID ya fue procesado. Esto protege contra cobros duplicados.

**No reintentar pagos fallidos.** TAPI tiene logica de reintentos interna que optimiza el flujo con los billers.

## Flujo Detallado de Pago de Servicios

```
1. POST /login → Obtener accessToken
   ↓
2. GET /services (Companies) → Catalogo de empresas
   ↓
3. Usuario selecciona empresa y modalidad
   ↓
4. Usuario ingresa identificador (numero de cliente, barcode, etc.)
   ↓
5. Validar input (minLength, maxLength, dataType)
   ↓
6. POST /debts → Consultar deuda pendiente
   ↓  Genera debtId fresco (efimero, usar inmediatamente)
   ↓
7. Mostrar deuda(s) al usuario (monto, vencimiento, amountType)
   ↓  Verificar expired=false antes de permitir pago
   ↓
8. Usuario confirma pago → POST /payment (siempre responde 202 + status: processing)
   ↓
9. Mostrar pantalla "procesando" (15 segundos)
   ↓
10a. Webhook confirmPayment llega → Mostrar resultado final (confirmed/failed)
   ↓ (si no llega en 15s)
10b. Mostrar pantalla "pago en proceso" (naranja/intermedia)
   ↓
11. Confirmar al usuario via push notification o email cuando se resuelva
   ↓ (respaldo)
12. GET /operation/{operationId} con polling backoff si webhook nunca llega
```

### Flujo ante timeout de POST /payment

```
1. POST /payment da timeout (no llega response)
   ↓  NUNCA reintentar automaticamente
   ↓
2. GET /operation/{externalPaymentId}?type=external-payment-id
   ↓
3a. Si retorna datos → El pago llego a TAPI. Verificar status
3b. Si retorna 404 → El pago NUNCA llego. Seguro reintentar con nuevo POST /payment
3c. Si el GET tambien falla → Esperar y reintentar el GET con backoff
```

## Buenas Practicas

- Cachear el catalogo de empresas y refrescar cada ~1 hora, no consultarlo en cada request
- Siempre mostrar el `helpText` de la modalidad al usuario
- Validar longitud del identificador antes de enviar a /debts
- Guardar `operationId` y `externalPaymentId` para soporte
- Implementar el webhook de confirmacion para estado final
- Verificar `expired` antes de mostrar una deuda como pagable
- Mostrar pantalla de procesando por 15 segundos esperando webhook; si no llega, informar "pago en proceso" y confirmar luego via push/email
- NUNCA cachear respuestas de POST /debts (las deudas son dinamicas, los debtId son efimeros)
- Deshabilitar boton de pago tras primer clic para prevenir pagos duplicados
- Almacenar siempre tanto `operationId` como `externalPaymentId`

## Preguntas Frecuentes (FAQs)

**Por que la consulta de deudas es POST y no GET?**
Porque el request contiene datos sensibles del usuario (`identifierValue`). Usar POST evita que queden en logs de servidores, historial del navegador o headers de referencia.

**Puede una empresa retornar multiples deudas?**
Si. Un cliente puede tener multiples facturas pendientes. Cada deuda tiene su propio `debtId`. La UI debe soportar un numero arbitrario de deudas.

**Cual es la diferencia entre amountType CLOSED y OPEN?**
CLOSED: monto fijo (`minAmount == maxAmount`), mostrar sin campo editable. OPEN: monto abierto, el `amount` devuelto es **0** porque el biller no informa un monto fijo. El usuario elige cuanto pagar dentro del rango `[minAmount, maxAmount]`. Mostrar campo editable con el rango permitido. Nunca mostrar `$0` al usuario como si fuera el monto adeudado; en su lugar, indicar que el monto es a eleccion del usuario.

**Que hago con las deudas expiradas (expired=true)?**
No permitir el pago. Mostrar como informativa con indicador visual de "vencida". Deshabilitar el boton de pago.

**El debtId tiene tiempo de expiracion?**
Si. Tratar el `debtId` como efimero. Obtener uno fresco de `POST /debts` justo antes de pagar. No almacenar `debtId` para uso diferido.

**Es seguro reintentar la consulta de deudas?**
Si. `POST /debts` es una operacion de solo lectura sin side effects. Seguro reintentar ante timeouts o errores 5xx.

**Debo cachear las deudas?**
NUNCA. Las deudas son dinamicas: pueden cambiar por pagos parciales o pagos desde otros canales. Cuando otro canal actualiza la deuda en el biller, TAPI refleja ese cambio en la proxxima consulta a `POST /debts`. Los `debtId` se regeneran con cada consulta.

**Si el usuario paga por otro canal, TAPI se entera?**
TAPI no recibe notificaciones directas de pagos en otros canales. Pero la consulta de deuda (`POST /debts`) se realiza en tiempo real contra el biller. Si el biller ya actualizo la deuda (por pago parcial o total desde otro canal), la respuesta de TAPI reflejara el estado actual. Si la deuda fue pagada en su totalidad, la consulta retornara sin deudas pendientes.

**El externalPaymentId garantiza idempotencia?**
TAPI rechaza un segundo pago con el mismo `externalPaymentId` (error SPA04649). Implementar tambien idempotencia del lado propio: verificar en BD si ya existe un pago con ese ID antes de enviar.

**Cual es la diferencia de comportamiento entre sandbox y produccion?**
En sandbox, los pagos se confirman inmediatamente (status `confirmed` sincrono, no llega webhook). En produccion, siempre es asincrono (`processing`, esperar webhook o polling).

**Que hago si POST /payment da timeout?**
NUNCA reintentar automaticamente. Consultar `GET /operation/{externalPaymentId}?type=external-payment-id`. Si 404, seguro reintentar. Si existe, verificar status.

**Como manejar el status "processing"?**
Registrar `operationId` y `externalPaymentId` con estado "pendiente". Mostrar "pago en proceso" al usuario. Esperar webhook (primario) o polling (respaldo). Actualizar cuando llegue confirmacion.

**Que es el campo additionalData.ticket?**
Es un array de strings que representa el comprobante de pago del proveedor, linea por linea. Renderizar con fuente monoespaciada. Ofrecer opcion de compartir o descargar.

**Puedo revertir o cancelar un pago ya procesado?**
No. TAPI no soporta reversiones ni cancelaciones de pagos. Si ocurre un problema post-pago, contactar al equipo de operaciones de TAPI.

**El paymentMethod afecta el procesamiento?**
No. Es puramente informativo. TAPI no diferencia entre `DEBIT`, `ACCOUNT` o `CREDIT`. Enviar el valor correcto para reporteria y conciliacion.

**Que son los exchangeDetails en la respuesta de debts?**
Equivalencia del monto en otras monedas (referencia). El pago siempre se realiza en la moneda principal de la deuda.

**Que son las expirations en la respuesta de debts?**
Calendario de montos futuros. Indica que el monto cambiara despues de cierta fecha (ej: recargos moratorios). Mostrar aviso al usuario.

**Puedo hacer pagos concurrentes para diferentes deudas?**
Si, siempre que cada pago tenga un `debtId` diferente y un `externalPaymentId` unico. No enviar pagos concurrentes para la misma deuda.

## Skills Relacionados

- [[base]] - Contexto general de TAPI
- [[auth]] - Autenticacion requerida
- [[companies]] - Catalogo de empresas, modalidades y queryData
- [[agenda]] - Adhesiones para consultas recurrentes
