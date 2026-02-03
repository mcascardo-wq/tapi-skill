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

## Endpoints

### GET /services

Obtiene el listado de empresas de servicios activas. Paginado (5000 por pagina por defecto).

**Headers:**
- `x-authorization-token`: Token JWT obtenido del login
- `x-api-key`: API key provista por TAPI

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
- `amount`: Monto de la factura
- `minAmount` / `maxAmount`: Rango permitido de pago
- `amountType`: "OPEN" (monto abierto) o "CLOSED" (monto fijo)
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

---

### Webhook confirmPayment

TAPI envia la confirmacion del pago a un endpoint del cliente.

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

Consulta el estado de una operacion.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Response:**
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
  "additionalData": {...}
}
```

**Busqueda por externalPaymentId:**
```
GET /operation/{externalPaymentId}?type=external-payment-id
```

## Tipos de Modalidad

| modalityType | Descripcion |
|--------------|-------------|
| input | Ingreso manual (numero de cliente, etc.) |
| barcode | Codigo de barras de la factura |
| qr | Codigo QR |

## Tipos de Datos (dataType)

| Codigo | Descripcion |
|--------|-------------|
| ALF | Alfanumerico |
| NUM | Numerico |
| FEC | Fecha |
| IMP | Importe |
| CBA | Codigo de barras |

## Casos Edge

- **Sin deuda**: La consulta puede retornar `debts: []` si no hay deuda pendiente
- **Factura vencida**: `expired: true` indica que ya no se puede pagar
- **Pago parcial**: Solo si `amountType: "OPEN"` y `minAmount < amount`
- **Timeout**: Siempre verificar estado final con GET /operation despues de pagar
- **Codigo invalido**: Validar formato segun `minLength`/`maxLength` antes de consultar

## Errores Comunes

| Error | Codigo | Causa | Solucion |
|-------|--------|-------|----------|
| 404 | SDE04342 | No hay deuda pendiente | Informar al usuario |
| 400 | - | Parametros invalidos | Verificar formato segun modalidad |
| 500 | XCX05060 | Error interno | Reintentar mas tarde |

## Buenas Practicas

- Cachear el catalogo de empresas, no consultarlo en cada request
- Siempre mostrar el `helpText` de la modalidad al usuario
- Validar longitud del identificador antes de enviar a /debts
- Guardar `operationId` y `externalPaymentId` para soporte
- Implementar el webhook de confirmacion para estado final
- Verificar `expired` antes de mostrar una deuda como pagable

## Skills Relacionados

- [[base]] - Contexto general de TAPI
- [[auth]] - Autenticacion requerida
- [[agenda]] - Adhesiones para consultas recurrentes
