# TAPI Recargas

## Que es

Permite a tus usuarios realizar recargas de credito movil, paquetes de datos y otros servicios prepagos desde tu plataforma. TAPI se conecta con los operadores para procesar recargas en tiempo real. Soporta operadores de Latinoamerica (Movistar, Claro, Personal, etc.) y servicios como DirecTV Prepago.

## Conceptos Clave

- **Company**: Operador o proveedor del servicio de recarga (ej: Movistar, Claro, Personal). Identificado por `companyCode` (ej: `AR-R-0001`).
- **Product**: Tipo de recarga disponible dentro de una company. Tiene un `productId`, tipo de monto y rango de valores.
- **amountType**: Define como se determina el monto de la recarga:
  - `OPEN`: Monto variable dentro de un rango (`minAmount` a `maxAmount`).
  - `CLOSED`: Monto fijo, igual a `minAmount` y `maxAmount`.
  - `FIXED`: Lista de montos permitidos definidos en `allowedAmounts`.
- **identifierName / identifierValue**: Identificador del destino de la recarga (ej: numero de telefono). El `identifierName` viene del catalogo de empresas.
- **operationId**: ID unico de la operacion, usado para trazabilidad y consulta de estado.

## Flujo de Recarga

1. **Listar empresas** - `GET /recharges` - Obtener catalogo de empresas y productos disponibles
2. **Consultar empresa** - `GET /{companyCode}` - (opcional) Obtener detalle de una empresa especifica
3. **Procesar recarga** - `POST /payment` - Ejecutar la recarga
4. **Recibir confirmacion** - Webhook `confirmPayment` - TAPI notifica el resultado final (solo si el payment respondio 202)
5. **Verificar estado** - `GET /operation/{operationId}` - Consultar estado en cualquier momento

## URLs Base

| Ambiente | URL |
|----------|-----|
| Sandbox | `https://recharge.homo.tapila.cloud` |
| Produccion | `https://recharge.tapila.cloud` |

## Endpoints

### GET /recharges

Obtiene el listado completo de empresas de recargas activas. Paginado.

**Headers:**
- `x-api-key`: API key del servicio de Recharge

**Query Params (opcionales):**
- `active`: Filtrar por disponibilidad. Default: `true`. Usar `?active=false` para ver las no disponibles.
- `searchCompany`: Filtrar por nombre de empresa (minimo 3 caracteres).
- `page`: Numero de pagina.

**Response 200 OK:**
```json
{
  "recharges": [
    {
      "companyCode": "AR-R-0001",
      "companyName": "MOVISTAR",
      "companyType": "RECHARGE",
      "companyLogo": "company-logo",
      "tags": [],
      "products": [
        {
          "productType": "RECARGA_SALDO",
          "productId": "1",
          "status": "live",
          "productDescription": "RECARGA",
          "amountType": "OPEN",
          "amount": 100,
          "minAmount": 100,
          "maxAmount": 5000,
          "allowedAmounts": [],
          "additionalData": {}
        }
      ],
      "identifierName": "IDV",
      "identifierValue": null,
      "dataType": "ALF",
      "helpText": null,
      "minLength": 100,
      "maxLength": 150
    },
    {
      "companyCode": "AR-R-0034",
      "companyName": "PERSONAL",
      "companyType": "RECHARGE",
      "companyLogo": "company-logo",
      "tags": ["telefonia"],
      "products": [
        {
          "productType": "RECARGA_SALDO",
          "productId": "1",
          "status": "live",
          "productDescription": "saldo",
          "amountType": "OPEN",
          "amount": 100,
          "minAmount": 10,
          "maxAmount": 200,
          "allowedAmounts": [],
          "additionalData": {}
        }
      ],
      "identifierName": "IDC",
      "identifierValue": null,
      "dataType": "IMP",
      "helpText": "numero de teléfono.",
      "minLength": 9,
      "maxLength": 15
    }
  ],
  "links": [
    { "rel": "next", "title": "Next interval", "href": "?page=2&limit=50" }
  ],
  "tx": "fba8b492-8a32-43ea-86f3-47f5737a17c2",
  "mainTx": "fba8b492-8a32-43ea-86f3-47f5737a17c2"
}
```

**Campos de la empresa:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| companyCode | String | Codigo de la compania |
| companyName | String | Nombre de la compania |
| companyType | String | Tipo de compania (siempre `RECHARGE`) |
| companyLogo | String | Logo de la empresa |
| tags | Object[] | Tags identificadores (ej: "telefonia") |
| products | Object[] | Productos disponibles para recarga |
| identifierName | String | Nombre del identificador a ingresar (ej: "Numero de telefono") |
| identifierValue | String | Valor a ingresar por el usuario |
| dataType | String | Tipo de dato esperado (`ALF`, `NUM`, `IMP`, etc.) |
| helpText | String | Texto de ayuda para el usuario |
| minLength | Number | Longitud minima del identificador |
| maxLength | Number | Longitud maxima del identificador |

**Campos de products[]:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| productType | String | Tipo de producto (ej: `RECARGA_SALDO`). En Argentina siempre es `Datos` |
| productId | String | ID del producto |
| productDescription | String | Descripcion del paquete |
| amountType | String | `OPEN` (variable), `CLOSED` (fijo) o `FIXED` (lista de valores) |
| amount | Number | Monto por defecto. Si `OPEN` es 0, si `CLOSED` es igual a min/max, si `FIXED` usar `allowedAmounts` |
| minAmount | Number | Valor minimo de la recarga |
| maxAmount | Number | Valor maximo de la recarga |
| allowedAmounts | List | Lista de montos permitidos (solo para `FIXED`) |
| additionalData | Object | Info adicional de la empresa (ej: paquetes en MX) |
| status | String | Estado del producto |

---

### GET /{companyCode}

Obtiene el detalle de una empresa de recarga especifica.

**Headers:**
- `x-api-key`

**Path Params:**
- `companyCode`: Codigo de la empresa (ej: `AR-R-0001`)

La respuesta tiene la misma estructura que cada elemento de `recharges[]` en `GET /recharges`. Si el codigo es incorrecto o la empresa esta inactiva, devuelve un error.

---

### POST /payment

Procesa una recarga.

**Comportamiento sincrono/asincrono**: En recargas, el pago es **sincrono en el ~98% de los casos**. El `POST /payment` responde con HTTP 200 y el status final (`confirmed` o `failed`) directamente. En casos excepcionales puede responder HTTP 202 con status `processing`, y la confirmacion llega via webhook.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Request:**
```json
{
  "companyCode": "AR-R-0034",
  "productId": "1",
  "amount": 105,
  "identifierName": "IDC",
  "identifierValue": "1115673423",
  "externalPaymentId": "asd-asd-asd",
  "externalClientId": "asd",
  "paymentMethod": "DEBIT"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| companyCode | String | Si | Codigo de la compania |
| productId | String | Si | ID del producto (del catalogo) |
| amount | Number | Si | Monto de la recarga |
| identifierName | String | Si | Nombre del identificador (del catalogo) |
| identifierValue | String | Si | Valor del identificador (ej: numero de telefono) |
| externalPaymentId | String | Si | ID propio del cliente para trazabilidad |
| externalClientId | String | No | Identificador del usuario final |
| paymentMethod | String | Si | `DEBIT` (tarjeta debito), `ACCOUNT` (dinero en cuenta) o `CREDIT` (tarjeta credito) |

**Response 200 OK:**
```json
{
  "operationId": "5ae6c8b0-ff91-47dc-9a90-5d5f03342556",
  "createdAt": "2022-09-07T15:36:08.022Z",
  "companyCode": "AR-R-0034",
  "companyName": "MOVISTAR S.A.",
  "amount": 105,
  "identifiers": [
    {
      "identifierValue": "1115673423",
      "identifierName": "IDC"
    }
  ],
  "agent": "Agente oficial Rapipago",
  "clientUserName": "tap.qa",
  "externalClientId": "asd",
  "externalPaymentId": "asd-asd-asd",
  "additionalData": null
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| operationId | String | ID de la operacion |
| createdAt | Datetime | Fecha y hora de la transaccion |
| companyCode | String | Codigo de compania |
| companyName | String | Nombre de la compania |
| amount | Number | Monto de la recarga |
| identifiers | Object[] | Identificador utilizado |
| agent | String | Nombre del agente procesador |
| clientUsername | String | Nombre de la fintech |
| externalClientId | String | Identificador del usuario final |
| externalPaymentId | String | ID del pago del cliente |
| additionalData | Object | Informacion adicional del servicio |

---

### Webhook confirmPayment

TAPI envia la confirmacion de la recarga al endpoint configurado del cliente. Solo se dispara cuando `POST /payment` responde con HTTP 202 (caso asincrono). El webhook se configura informando la URL al equipo de integraciones de TAPI (ver skill **Base**).

El campo `hash` permite validar la autenticidad del webhook si se tiene configurado un metodo de seguridad (API key o encriptacion con public key).

**Payload que TAPI envia:**
```json
{
  "operationId": "6bc68534-2597-4863-a01a-549c01fbfdb9",
  "status": "confirmed",
  "externalPaymentId": "a6dfad7d-984d-4cb7-a657-da8a583b64ad",
  "externalClientId": "749c245a-2b02-4a8f-8e11-6e20fc077e2b",
  "companyCode": "MX-R-00028",
  "companyName": "Bait",
  "amount": 100,
  "hash": "",
  "type": "RECHARGE"
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| operationId | String | ID de la operacion |
| status | String | `confirmed` si se acredito correctamente, `failed` si hubo error |
| externalPaymentId | String | ID del pago del cliente |
| externalClientId | String | Identificador del usuario final |
| companyCode | String | Codigo de la compania |
| companyName | String | Nombre de la compania |
| amount | Number | Monto de la recarga |
| type | String | Vertical de negocio (`RECHARGE`) |
| hash | String | Hash de verificacion |

**Response esperada del cliente:**
```json
{
  "status": "Confirm"
}
```

---

### GET /operation/{operationId}

Consulta el estado de una operacion de recarga. Solo necesario en dos casos:
1. **Caso excepcional de HTTP 202**: Cuando `POST /payment` respondio 202 (biller lento) y se necesita confirmar el resultado
2. **Reconciliacion**: Para verificar estados historicos

En el ~98% de los casos de recargas, `POST /payment` responde 200 con el estado final y no es necesario usar este endpoint.

**Importante**: Este endpoint existe en el microservicio de **Recharges** (`recharge.homo.tapila.cloud`). Un `operationId` de recargas no se encontrara si se consulta en el microservicio de servicios, y viceversa.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Path Params:**
- `operationId`: ID de la operacion

**Response 200 OK:**
```json
{
  "operation": {
    "operationId": "7fc44ee3-385f-4093-9936-632cb1a50907",
    "status": "confirmed",
    "externalPaymentId": "e529369e-7bf2-4cf9-952b-02391c3ce11e",
    "externalClientId": "20972834",
    "additionalData": {
      "agent": "Agente oficial Tapi",
      "customerId": "21710115468",
      "ticket": [],
      "providerName": "TAPI"
    },
    "companyCode": "AR-R-00407",
    "companyName": "CLARO",
    "amount": 90194.59,
    "createdAt": "2025-07-08T18:10:06.871Z"
  },
  "tx": "c4966efb-590b-4dcc-91f4-b35e593320d1",
  "mainTx": "681c4d5a-6318-48a8-aa63-6ec0357d261f"
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| operationId | String | ID de la operacion |
| status | String | `processing`, `confirmed` o `failed` |
| externalPaymentId | String | ID del pago del cliente |
| externalClientId | String | Identificador del usuario final |
| additionalData | Object | Datos adicionales (agent, customerId, ticket, providerName) |
| companyCode | String | Codigo de compania |
| companyName | String | Nombre de la compania |
| amount | Number | Monto de la recarga |
| createdAt | String | Fecha y hora UTC (ISO 8601) |

**Busqueda por externalPaymentId:**
```
GET /operation/{externalPaymentId}?type=external-payment-id
```

## Tools

### POST /exchange/rate

Obtiene el tipo de cambio que TAPI tiene para cada vertical de negocio.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Query Params (opcionales):**
- `countryCode`: Filtrar por pais (ej: `AR`)
- `companyType`: Filtrar por vertical (ej: `RECHARGE`, `SERVICE`, `SUBSCRIPTION`)

**Response 200 OK:**
```json
{
  "exchanges": [
    {
      "localCurrency": "ARS",
      "currency": "USD",
      "exchangeRate": 100,
      "countryCode": "AR",
      "companyType": "RECHARGE"
    }
  ],
  "tx": "72889b6d-fdc8-4b48-a3b9-5b7a2608f6a8",
  "mainTx": "02f26646-18ac-4b81-a4a7-cf089b6394b1"
}
```

### POST /wallet/balance

Consulta el balance del dinero prefondeado del cliente con TAPI. Control en tiempo real.

**Headers:**
- `x-authorization-token`
- `x-api-key`

## amountType por Pais

El comportamiento del `amountType` varia segun el pais:

| Pais | Comportamiento |
|------|----------------|
| Mexico | Predominantemente paquetes `CLOSED` (montos fijos) |
| Argentina, Colombia, Peru, Chile | Mix de `OPEN` (monto variable) y `CLOSED` (monto fijo) |

Tener en cuenta esta diferencia al disenar la pantalla de seleccion de monto.

## Errores de POST /payment

| HTTP | Codigo | Mensaje | Causa | Solucion |
|------|--------|---------|-------|----------|
| 400 | RPA04022 | Monto invalido | El monto no cumple el formato esperado | Verificar que sea un numero valido con hasta 2 decimales |
| 400 | XPA04023 | Falta productId | No se incluyo `productId` en el body | Agregar el `productId` del catalogo |
| 400 | RPA04041 | Monto fuera de rango | El monto esta por debajo de `minAmount` o por encima de `maxAmount` | Validar rango segun el producto antes de enviar |
| 404 | XCX04325 | Company not found | El `companyCode` no existe o esta inactivo | Verificar contra el catalogo actualizado |
| 404 | RPA04345 | Producto no encontrado | El `productId` no existe para esa company | Verificar `productId` en el catalogo |
| 409 | XPA04626 | externalPaymentId duplicado | Ya existe un pago con ese `externalPaymentId` | No reintentar; verificar estado con `GET /operation` |
| 429 | RPA04680 | Limite de recargas alcanzado | Se excedio el limite de recargas para ese numero | Informar al usuario; esperar antes de reintentar |
| 500 | XX05000 | Error del proveedor | El operador respondio con error | Reintentar mas tarde |
| 500 | XPA05170 | Error interno | Error interno de TAPI | Reintentar mas tarde |

## Idempotencia

Si se envia un `POST /payment` con un `externalPaymentId` ya utilizado, TAPI rechazara la solicitud (XPA04626) indicando que ese ID ya fue procesado. Esto protege contra cobros duplicados.

**No reintentar pagos fallidos.** TAPI tiene logica de reintentos interna que optimiza el flujo con los operadores.

## Flujo Detallado de Recarga

```
1. POST /login → Obtener accessToken
   ↓
2. GET /recharges (Companies) → Catalogo de empresas y productos
   ↓
3. Usuario selecciona empresa (operador)
   ↓
4. Mostrar productos disponibles (paquetes/montos)
   ↓
5. Usuario selecciona producto y monto (segun amountType)
   ↓
6. Usuario ingresa identificador (numero de telefono)
   ↓
7. Validar input (minLength, maxLength, dataType)
   ↓
8. POST /payment → Ejecutar recarga
   ↓
9a. HTTP 200 → Recarga confirmada. Mostrar resultado inmediato al usuario
   ↓ (caso excepcional ~2%)
9b. HTTP 202 → Biller lento. Status: processing
   ↓
10. Esperar webhook confirmPayment o polling con GET /operation
```

### Flujo ante timeout de POST /payment

```
1. POST /payment da timeout
   ↓  NUNCA reintentar con nuevo externalPaymentId (podria duplicar la recarga)
   ↓
2. Si se recibio operationId → GET /operation/{operationId}
   Si no se recibio response → Reintentar con el MISMO externalPaymentId
   ↓
3. TAPI rechaza duplicado si ya se proceso (XPA04626), o procesa si no
```

## Buenas Practicas

- Cachear el catalogo de empresas y refrescar cada ~1 hora, no consultarlo en cada request
- Validar longitud del identificador (`minLength`/`maxLength`) antes de enviar el pago
- Mostrar el `helpText` al usuario para que sepa que dato ingresar
- Respetar el `amountType`: si es `OPEN` validar rango, si es `CLOSED` usar monto fijo, si es `FIXED` solo permitir valores de `allowedAmounts`
- Guardar `operationId` y `externalPaymentId` para soporte y trazabilidad
- Implementar el webhook de confirmacion para el caso excepcional de HTTP 202
- Verificar estado con `GET /operation/{operationId}` si no llega el webhook
- Consultar `/exchange/rate` si se necesitan montos en USD
- Consultar `/wallet/balance` para verificar saldo antes de operar
- Deshabilitar boton de recarga tras primer clic para prevenir duplicados

## Preguntas Frecuentes (FAQs)

**Cual es la diferencia principal entre el flujo de recargas y el de servicios?**
Recargas es transaccional directo (seleccionar producto, pagar). No hay paso de consulta de deuda (`POST /debts`). El flujo tiene 4 pasos (Login, Catalogo, Payment, GetOp) vs 6 en servicios.

**Necesito consultar deuda antes de hacer una recarga?**
No. Las recargas no tienen concepto de "deuda". El usuario selecciona un producto del catalogo (que ya incluye monto y caracteristicas) y se ejecuta directamente.

**Como se que una recarga fue exitosa?**
Si recibes HTTP 200, la recarga fue exitosa. No necesitas polling ni webhook. Solo en el caso excepcional de HTTP 202 la confirmacion se vuelve asincrona.

**Que pasa si el request da timeout?**
No asumir que fallo. No reintentar con nuevo `externalPaymentId` (podria duplicar). Si se recibio `operationId`, consultar `GET /operation`. Si no se recibio response, reintentar con el **mismo** `externalPaymentId`.

**El token es el mismo que uso para servicios?**
Si. El `accessToken` de `POST /login` sirve para ambos microservicios. Lo que cambia es la `x-api-key` (cada microservicio tiene la suya).

**Puedo recargar cualquier numero de telefono?**
El endpoint no valida si el numero pertenece al operador seleccionado. Implementar validacion del lado del integrador si es posible, aunque con la portabilidad numerica no siempre se puede determinar el operador actual.

**Puedo hacer multiples recargas al mismo numero?**
Si, pero cada una debe tener un `externalPaymentId` unico. Los operadores pueden imponer limites de recargas por numero (error RPA04680) que varian por operador, monto y periodo.

**Puedo revertir o cancelar una recarga ya procesada?**
No. TAPI no soporta reversiones ni cancelaciones de recargas. Si ocurre un problema post-pago, contactar al equipo de operaciones de TAPI.

**El paymentMethod afecta el procesamiento?**
No. Es puramente informativo. TAPI no cobra al usuario final; eso es responsabilidad del integrador. Enviar el valor correcto para reporteria y conciliacion.

**Que es la empresa de homologacion MX-R-90006?**
Es una empresa de prueba de TAPI con un solo producto (Recarga $200 CLOSED) y comportamiento predecible. Usar para pruebas iniciales de integracion y CI/CD automatizados.

**Como manejo el campo additionalData del producto?**
En la mayoria de productos es null. Si contiene campos, incluirlos en el request. `packageInformation` puede incluir datos de internet, minutos y SMS del paquete.

**Cual es el formato correcto del numero de telefono para Mexico?**
10 digitos sin prefijo (ej: `5525752111`). No usar prefijo +52 ni 52.

**El endpoint es idempotente?**
Si, gracias al `externalPaymentId`. UUID nuevo = operacion nueva. UUID repetido = rechazo (XPA04626). Esto protege contra cobros dobles.

**Que pasa si consulto un operationId de recargas en el microservicio de servicios?**
Recibiras HTTP 400. Los microservicios son independientes. Almacenar el tipo de operacion junto con el `operationId` para dirigir las consultas al microservicio correcto.

## Skills Relacionados

- [[base]] - Contexto general de TAPI
- [[auth]] - Autenticacion requerida (POST /login, headers x-authorization-token y x-api-key)
- [[companies]] - Catalogo de empresas, productos y queryData
