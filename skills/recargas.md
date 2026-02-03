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

## Endpoints

### GET /recharges

Obtiene el listado completo de empresas de recargas activas. Paginado.

**Headers:**
- `x-api-key`

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

TAPI envia la confirmacion de la recarga al endpoint del cliente. Solo se dispara cuando el servicio de payment responde con HTTP 202. Puede incluir headers custom para autenticacion.

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

Consulta el estado de una operacion de recarga.

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
| status | String | `pending`, `confirmed` o `failed` |
| externalPaymentId | String | ID del pago del cliente |
| externalClientId | String | Identificador del usuario final |
| additionalData | Object | Datos adicionales sobre la imputacion |
| companyCode | String | Codigo de compania |
| companyName | String | Nombre de la compania |
| amount | Number | Monto de la recarga |
| createdAt | String | Fecha y hora UTC del procesamiento |

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

## Buenas Practicas

- Cachear el catalogo de empresas, no consultarlo en cada request
- Validar longitud del identificador (`minLength`/`maxLength`) antes de enviar el pago
- Mostrar el `helpText` al usuario para que sepa que dato ingresar
- Respetar el `amountType`: si es `OPEN` validar rango, si es `CLOSED` usar monto fijo, si es `FIXED` solo permitir valores de `allowedAmounts`
- Guardar `operationId` y `externalPaymentId` para soporte y trazabilidad
- Implementar el webhook de confirmacion para recibir el estado final
- Verificar estado con `GET /operation/{operationId}` si no llega el webhook
- Consultar `/exchange/rate` si se necesitan montos en USD
- Consultar `/wallet/balance` para verificar saldo antes de operar

## Skills Relacionados

- [[base]] - Contexto general de TAPI
- [[auth]] - Autenticacion requerida (POST /login, headers x-authorization-token y x-api-key)
