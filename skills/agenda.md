# TAPI Agenda

## Que es

El modulo de Agenda gestiona recordatorios de pagos a traves de dos conceptos fundamentales: adhesion y notificacion.

La **adhesion** es el vinculo del usuario X con la empresa Y mediante un identificador. El usuario queda registrado a traves del identificador ingresado con la empresa elegida para pagar. TAPI interpreta que ese usuario quiere ser notificado cuando tenga una nueva deuda por pagar.

La **notificacion** es el aviso de nueva deuda o recordatorio a pagar por parte de TAPI, dada una adhesion.

## Conceptos Clave

- **Adhesion**: Vinculo entre un usuario y una empresa mediante un identificador de servicio. Se genera automaticamente al realizar un pago exitoso, o manualmente via API.
- **Notificacion**: Aviso de nueva deuda o recordatorio de pago para un servicio adherido.
- **externalClientId**: Identificador unico del usuario final. Debe ser el mismo que se usa en billPayment en la consulta de deuda.
- **agendaId**: Identificador unico de cada adhesion, compuesto por `externalClientId#modalityId#serviceIdentifier`.
- **notificationId**: Identificador de la notificacion. Funciona como ID de deuda y se usa para avanzar al pago.

## Tipos de Recordatorios

| Tipo | Descripcion |
|------|-------------|
| `NEW_BILL` | Nueva deuda. Se conoce el periodo de facturacion y el monto adeudado. Puede incluir fecha de vencimiento (estimada: `expirationDateWasEstimated: true`). |
| `EXPIRATION` | Vencimiento proximo. Se conoce el periodo de facturacion, monto y fecha de vencimiento real (`expirationDateWasEstimated: false`). |
| `PAY_AGAIN` | Recordatorio de pago. Se conoce el periodo de facturacion pero no se expone la deuda o solo permite pagos con importe abierto (empresas prepagas). |

## Adhesion al Servicio

La adhesion se realiza de dos formas:

1. **Automatica**: Al procesar un pago exitosamente, el usuario queda adherido automaticamente para recibir notificaciones en el proximo periodo de facturacion.
2. **Manual**: Via el endpoint `POST /adhesions/register`, la fintech envia la adhesion solicitada por el usuario sin necesidad de pasar por el flujo de consulta y pago.

Se puede deshabilitar las adhesiones automaticas y dejar en manos de los usuarios la decision de adherirse.

## Endpoints

### GET /adhesions/{externalClientId}

Consulta las adhesiones de un usuario particular.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Query Params (opcionales):**
- `allAdhesions=true`: Obtener todas las adhesiones, activas e inactivas.
- `includeNotifications=true`: Incluir notificaciones asociadas a cada adhesion.

**Response 200 OK:**
```json
{
  "adhesions": [
    {
      "serviceIdentifier": "0000000901",
      "modalityId": "51ea6bf3-819f-44cf-9df7-5eb25b404150",
      "companyCode": "AR-S-02602",
      "alias": null,
      "type": "EXPIRATION",
      "agendaId": "pruebaAgenda1#51ea6bf3-819f-44cf-9df7-5eb25b404150#0000000901",
      "isAutomaticDebit": false,
      "isAdhered": true
    }
  ],
  "tx": "d9ebc3fc-2100-44a6-90ac-bc48ef4bfc69",
  "mainTx": "30f6a885-f0f9-4a45-be7b-34ee9e7f39f7"
}
```

**Campos de adhesions[]:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| serviceIdentifier | String | Identificador del servicio usado por el cliente |
| modalityId | UUID | Id de modalidad de esa compania |
| companyCode | String | Codigo de la empresa adherida |
| alias | String | Identificador asignado por el usuario |
| type | String | Tipo de notificacion que llegara (`NEW_BILL`, `EXPIRATION`, `PAY_AGAIN`) |
| agendaId | String | Identificador unico de la adhesion |
| isAutomaticDebit | Boolean | Indica si la adhesion esta suscrita a debito automatico |
| isAdhered | Boolean | Indica si la adhesion esta activa |

Con `includeNotifications=true`, cada adhesion incluye ademas un campo `notifications[]` con las notificaciones vigentes, y campos adicionales `companyName` y `companyLogo`.

**Response con notificaciones:**
```json
{
  "adhesions": [
    {
      "serviceIdentifier": "990217915266",
      "modalityId": "219e1f8b-e3f3-43b6-b381-de832c2e90e4",
      "companyCode": "AR-S-0002",
      "companyName": "BANCO DEL SOL",
      "companyLogo": "company-logo",
      "alias": null,
      "type": "EXPIRATION",
      "agendaId": "pruebaJona1#51ea6bf3-819f-44cf-9df7-5eb25b404150#0000000001",
      "isAutomaticDebit": false,
      "isAdhered": true,
      "notifications": [
        {
          "id": "9e5a6e3c-8699-4ca9-8398-721365e05bdc0",
          "companyName": "BANCO DEL SOL",
          "type": "EXPIRATION",
          "agendaId": "pruebaJona1#51ea6bf3-819f-44cf-9df7-5eb25b404150#0000000001",
          "companyCode": "AR-S-0002",
          "companyLogo": "company-logo",
          "expirationDate": "2023-12-31",
          "amount": 4.06
        }
      ]
    }
  ],
  "tx": "416e6502-6f2e-4768-9c57-6aec290e5b57",
  "mainTx": "14690e95-5a4a-4856-899c-c087be2842ca"
}
```

**Errores:**

| Codigo | Estado | Mensaje |
|--------|--------|---------|
| AGA0003 | 404 | There are no adhesions. |
| AGA0004 | 504 | There was an unknown error requesting a adhesion. |

---

### PATCH /adhesions

Activa, desactiva o modifica el alias de una adhesion.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Request:**
```json
{
  "agendaId": "099028ad-61ff-4a15-bf7e-b17eceb107e2#219e1f8b-e3f3-43b6-b381-de832c2e90e4#990217915266",
  "isAdhered": false
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| agendaId | String | Si | Identificador de la adhesion de agenda |
| isAdhered | Boolean | No | `true` para activar, `false` para desactivar |
| alias | String | No | Alias para referenciar la adhesion |

**Response 200 OK:**
```json
{
  "serviceIdentifier": "990217915266",
  "modalityId": "219e1f8b-e3f3-43b6-b381-de832c2e90e4",
  "companyCode": "AR-S-0002",
  "alias": "test1",
  "type": "EXPIRATION",
  "agendaId": "099028ad-61ff-4a15-bf7e-b17eceb107e2#219e1f8b-e3f3-43b6-b381-de832c2e90e4#990217915266",
  "isAutomaticDebit": false,
  "isAdhered": false,
  "tx": "28039794-bfff-4d54-9ea4-73f15df9241a",
  "mainTx": "6835b2fa-ace9-4e03-b204-1378463dd891"
}
```

**Errores:**

| Codigo | Estado | Mensaje |
|--------|--------|---------|
| AGM0003 | 404 | There are no adhesions. |
| AGM0004 | 504 | There was an unknown error requesting a adhesion. |

---

### POST /adhesions/register

Crea una adhesion manualmente sin necesidad de pasar por el flujo de pago.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Request:**
```json
{
  "companyCode": "AR-S-02602",
  "modalityId": "dc7850b5-799d-4225-824f-9c308c0a1d00",
  "alias": "pruebamx",
  "queryData": [
    {
      "identifierName": "clientNumber",
      "identifierValue": "2000000001"
    }
  ],
  "externalClientId": "uuid-del-usuario"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| companyCode | String | Si | Codigo de compania |
| modalityId | String | Si | Id de la modalidad |
| alias | String | Si | Alias para referenciar la adhesion |
| queryData | Object[] | Si | Objeto con el identificador de la factura (`identifierName`, `identifierValue`) |
| externalClientId | String | Si | Identificador unico del usuario. Debe ser el mismo usado en billPayment |

**Response 200 OK:**
```json
{
  "serviceIdentifier": "2000000001",
  "modalityId": "dc7850b5-799d-4225-824f-9c308c0a1d00",
  "companyCode": "AR-S-02602",
  "companyName": "TAPI- TEST 1",
  "companyLogo": "https://public-logo.prod.tapila.cloud/ar/tapi.png",
  "alias": "PruebaMx",
  "type": "NEW_BILL",
  "agendaId": "1b8b3b52-8924-47a3-aada-721a750d7111#dc7850b5-799d-4225-824f-9c308c0a1d00#2000000001",
  "isAutomaticDebit": false,
  "isAdhered": true,
  "tx": "454fda30-793a-49f3-9665-3c62f26361b5",
  "mainTx": "98968ab7-dd2b-4114-ad4d-f349c81f6ef0"
}
```

**Errores:**

| Codigo | Estado | Mensaje | Comentario |
|--------|--------|---------|------------|
| AGA0007 | 400 | Modality is invalid for agenda | Biller no configurado para agenda |
| AGA0009 | 500 | There was an error with the adhesion to agenda | Error al verificar e intentar enrolar la referencia |
| AGXCX0006 | 500 | There was an unknown error while executing the request. | Error default del flujo |

---

### Webhook de Adhesiones

Webhook configurable que envia las adhesiones generadas por pagos del usuario. Puede incluir headers custom para autenticacion.

**Payload:**
```json
{
  "agendaAdhesion": {
    "serviceIdentifier": "1000000000",
    "agendaId": "fe656d71-4447-4c56-97c2-ec196b2d9d9c#024c4f1b-c23a-4885-bc22-3517a568ce6d#0000001720000013538",
    "type": "NEW_BILL",
    "companyName": "BCO MUNICIPAL - SIRPLUS",
    "companyCode": "AR-S-02462",
    "modalityId": "5c9fc993-73a9-4929-ab8b-2b75b9864329",
    "companyLogo": "",
    "alias": "edenor",
    "externalClientId": "fe656d71-4447-4c56-97c2-ec196b2d9d9c",
    "isAutomaticDebit": false,
    "isAdhered": true
  },
  "type": "ADHESION_CREATED",
  "hash": "d51514bb77f31c96..."
}
```

---

### GET /notifications/{externalClientId}

Consulta las notificaciones/novedades de agenda vigentes para un usuario.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Query Params (opcionales):**
- `companyName`: Filtrar por empresa. Sin este filtro se devuelven todas.

**Response 200 OK:**
```json
{
  "notifications": [
    {
      "id": "478df922-94d7-4e52-9ade-88f81371632e-0",
      "companyCode": "AR-S-02699",
      "companyName": "TAPI - HOMOLOGACION 99",
      "type": "EXPIRATION",
      "agendaId": "pruebaAgenda1#7a6bfcf5-f29b-40f4-a59c-ac65ad9f656a#CUIT20297378032",
      "expirationDate": "2023-06-01",
      "expirationDateWasEstimated": false,
      "amount": 9540
    },
    {
      "id": "c3dead33-44dc-4ff7-bb96-cc040ff9315c-0",
      "companyCode": "AR-S-02603",
      "companyName": "TAPI - HOMOLOGACION 2",
      "type": "PAY_AGAIN",
      "agendaId": "pruebaAgenda1#60050cfa-a515-4e88-a92d-2c1666cb80e0#12345678",
      "lastPaidAmount": 0,
      "lastPaidDate": "2023-05-22"
    },
    {
      "id": "96a9bc48-8a0b-4582-b481-416e5737acb9-0",
      "companyCode": "AR-S-02603",
      "companyName": "TAPI - HOMOLOGACION",
      "type": "NEW_BILL",
      "agendaId": "pruebaAgenda1#98cb657c-78e1-4fe6-90f9-745fcc82044b#0000112233",
      "lastPaidDate": "2023-05-22",
      "amount": 2500,
      "expirationDate": "2023-06-02",
      "expirationDateWasEstimated": true
    }
  ],
  "tx": "afb45f85-3241-4f0a-859c-2d9b97889361",
  "mainTx": "27754e44-3460-4931-bc13-5ea1a3bb008e"
}
```

**Campos base de notifications[]:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID | Identificador de la notificacion. Se usa como debtId para avanzar al pago |
| companyCode | String | Codigo de empresa en TAPI |
| companyName | String | Nombre de la empresa |
| type | String | Tipo de notificacion (`EXPIRATION`, `NEW_BILL`, `PAY_AGAIN`) |
| agendaId | String | Identificador de adhesion de agenda |

**Campos adicionales segun type:**

Para `EXPIRATION`:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| expirationDate | Date | Fecha de vencimiento |
| expirationDateWasEstimated | Boolean | `false` - fecha real del biller |
| amount | Decimal | Importe de la deuda |

Para `NEW_BILL`:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| expirationDate | Date | Fecha de vencimiento |
| expirationDateWasEstimated | Boolean | `true` - fecha estimada |
| amount | Decimal | Importe de la deuda |
| lastPaidDate | Date | Fecha del ultimo pago registrado |

Para `PAY_AGAIN`:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| lastPaidDate | Date | Fecha del ultimo pago registrado |
| lastPaidAmount | Decimal | Importe del ultimo pago registrado |

---

### Webhook de Recordatorios

Webhook configurable que envia las notificaciones de agenda al instante. Puede incluir headers custom para autenticacion.

Hay tres tipos de webhook:

**1. First Notification (`AGENDA_FIRST_NOTIFICATION`)**

Notificacion de una nueva deuda.

```json
{
  "agendaNotification": {
    "clientUsername": "client.dev",
    "agendaId": "fd5aa0bf-a723-4057-b6da-3a729f21f87d#3f1fd044-04bf-4092-a631-d740921450d3#30012445401",
    "createdAt": 20240718,
    "type": "EXPIRATION",
    "id": "509314f0-3341-4fa2-a13b-6bb82ccd063b0",
    "companyName": "METROGAS",
    "amount": 3232.25,
    "companyCode": "AR-S-01477",
    "companyLogo": "https://public-logo.prod.tapila.cloud/ar/Metrogas.png",
    "source": "AGENDA_FIRST_NOTIFICATION",
    "exchangeDetail": [
      { "amount": 2.57, "currency": "USD", "exchangeRate": 1256.48 }
    ],
    "externalClientId": "fd5aa0bf-a723-4057-b6da-3a729f21f87d",
    "expirationDate": "2024-07-27",
    "expirationDateWasEstimated": false
  },
  "type": "AGENDA_NOTIFICATION",
  "hash": "430d8452ed031451..."
}
```

**2. Update Notification (`NOTIFICATION_UPDATE`)**

Actualizacion de una deuda existente por cambios en la misma.

```json
{
  "agendaNotification": {
    "source": "NOTIFICATION_UPDATE",
    ...
  },
  "type": "UPDATE_NOTIFICATION",
  "hash": "hash"
}
```

**3. Delete Notification (`DELETE_NOTIFICATION`)**

Eliminacion de notificacion porque se pago o ya no esta disponible.

```json
{
  "agendaNotification": {
    "source": "PAYMENT",
    ...
  },
  "type": "DELETE_NOTIFICATION",
  "hash": "hash"
}
```

El campo `source` en delete puede ser: `PAYMENT` (se pago), `NO_DEBT` (no hay deuda) o `EXPIRED` (vencio).

---

### POST /prepare-payment

Prepara el pago a partir de notificaciones de agenda, sin necesidad de consultar deuda ni pedirle datos al usuario. Acepta hasta 10 ids por solicitud.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Request:**
```json
{
  "ids": ["notificationId-1", "notificationId-2"]
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| ids | String[] | Si | Coleccion de identificadores de notificaciones de agenda (`id` del notification) |

**Response 200 OK:**
```json
{
  "debtsResponse": [
    {
      "notificationId": "abcd1234-5678-90ef-ghij-klmnoprstuvw-0",
      "status": "SUCCESS",
      "response": {
        "operationId": "d3f40d76-3014-428c-893e-5adfea38f501",
        "companyCode": "AR-S-00001",
        "companyName": "Ejemplo",
        "debts": [
          {
            "debtId": "d3f40d76-3014-428c-893e-5adfea38f501-0",
            "currency": "ARS",
            "amount": 1000,
            "minAmount": 1000,
            "maxAmount": 1000,
            "expirationDate": "2025-01-31",
            "amountType": "CLOSED",
            "expired": false
          }
        ]
      }
    },
    {
      "notificationId": "fedcba-0000-90ef-ghij-klmnoprstuvw-0",
      "status": "FAILED",
      "error": {
        "code": "SDE04342",
        "message": "There is no pending debt.",
        "status": 404
      }
    }
  ],
  "tx": "ccc7dbaf-c625-4c27-b86b-8903766b68e0",
  "mainTx": "af6cd1b9-1f39-4cbb-9fa1-64ad36765d2d"
}
```

Para status `SUCCESS`, el campo `response` contiene la respuesta original del servicio `/debt` (operationId, debts[], etc.).

Para status `FAILED`, el campo `error` contiene la respuesta de error del servicio `/debt`.

**Errores:**

| Codigo | Estado | Mensaje |
|--------|--------|---------|
| SDE04342 | 404 | There is no pending debt. |
| XCX05060 | 500 | There was an unknown error while executing the request. |

---

### POST /bulk-payment

Permite pagar multiples deudas en una sola solicitud (hasta 10). Funciona similar a `/payment` de billPayment pero acepta una coleccion. La confirmacion llega via webhook por separado para cada pago.

**Headers:**
- `x-authorization-token`
- `x-api-key`

**Request:**
```json
{
  "debtsToPay": [
    {
      "debtId": "62083ec0-dac0-4856-a183-6a0619ab21dc-0",
      "amount": 997456,
      "paymentMethod": "ACCOUNT",
      "externalPaymentId": "uuid-generado-por-cliente"
    },
    {
      "debtId": "62083ec0-dac0-4856-a183-6a0859ab21dc-0",
      "amount": 500,
      "paymentMethod": "ACCOUNT",
      "externalPaymentId": "uuid-generado-por-cliente"
    }
  ]
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| debtId | UUID | Identificador de deuda (del prepare-payment o de /debts) |
| amount | Number | Importe a pagar |
| paymentMethod | String | `ACCOUNT` (dinero en cuenta), `DEBIT` (tarjeta debito) o `CREDIT` (tarjeta credito) |
| externalPaymentId | String | Identificador del pago asignado por el cliente |

**Response 200 OK:**
```json
{
  "paymentsResponse": [
    {
      "debtId": "uuid-n",
      "status": "SUCCESS",
      "response": { }
    },
    {
      "debtId": "uuid-n",
      "status": "FAILED",
      "error": { "code": "...", "message": "...", "status": 500 }
    }
  ]
}
```

Para status `SUCCESS`, `response` contiene la respuesta original de `/payment`.
Para status `FAILED`, `error` contiene la respuesta de error de `/payment`.

Si alguno de los pagos falla, se deben realizar reembolsos parciales al usuario.

**Errores:**

| Codigo | Estado | Mensaje |
|--------|--------|---------|
| XCX05060 | 500 | There was an unknown error while executing the request. |

## Flujo de Pago desde Notificaciones

Hay dos opciones para pagar a partir de notificaciones:

1. **Flujo tradicional**: Usar el `notificationId` como debtId y avanzar con los endpoints de pago de servicios (`POST /payment` + webhook `confirmPayment`).
2. **Flujo bulk**: Usar `POST /prepare-payment` con los notificationIds, luego `POST /bulk-payment` con los debtIds obtenidos. La confirmacion llega por webhook individual para cada pago.

## Envio de Recordatorios

Los recordatorios se pueden recibir por tres vias:

1. **SFTP**: Archivo con novedades de TODOS los usuarios. Cada tipo de notificacion tiene su propio archivo.
2. **Webhook**: Envio instantaneo para un usuario particular (requiere configuracion).
3. **API**: Consulta bajo demanda via `GET /notifications/{externalClientId}`.

## Buenas Practicas

- Usar el mismo `externalClientId` en todos los flujos (billPayment y agenda)
- Guardar `agendaId` y `notificationId` para soporte y trazabilidad
- Validar que la adhesion este activa (`isAdhered: true`) antes de mostrarla al usuario
- Implementar el webhook de recordatorios para notificaciones en tiempo real
- Para pagos multiples via bulk-payment, implementar logica de reembolso parcial en caso de fallo

## Skills Relacionados

- [[base]] - Contexto general de TAPI
- [[auth]] - Autenticacion requerida
- [[servicios]] - Pago de los servicios adheridos (endpoints /payment y /debts)
