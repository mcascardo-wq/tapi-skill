# TAPI Agenda

## Que es

El modulo de Agenda gestiona recordatorios de pagos y debito automatico a traves de tres conceptos fundamentales: adhesion, notificacion y debito automatico.

La **adhesion** es el vinculo del usuario X con la empresa Y mediante un identificador. El usuario queda registrado a traves del identificador ingresado con la empresa elegida para pagar. TAPI interpreta que ese usuario quiere ser notificado cuando tenga una nueva deuda por pagar.

La **notificacion** es el aviso de nueva deuda o recordatorio a pagar por parte de TAPI, dada una adhesion.

El **debito automatico** permite automatizar el pago recurrente de servicios: cuando TAPI detecta una nueva deuda para una adhesion con debito activo, notifica a la fintech para que ejecute el cobro sin intervencion del usuario.

## URLs Base

| Ambiente | URL |
|----------|-----|
| Sandbox | `https://agenda.homo.tapila.cloud` |
| Produccion | `https://agenda.tapila.cloud` |

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

| Codigo | Estado | Mensaje | Solucion |
|--------|--------|---------|----------|
| AGXCX0003 | 400 | isAdhered and alias is invalid | Body vacio o sin campos validos. Enviar al menos `isAdhered` o `alias` |
| AGM0003 | 404 | There are no adhesions | El `agendaId` no existe. Verificar con `GET /adhesions` |
| AGM0004 | 504 | There was an unknown error requesting a adhesion | Reintentar con backoff |

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

Webhook configurable que envia las adhesiones generadas por pagos del usuario. Se configura informando la URL al equipo de integraciones (ver skill **Base**). El campo `hash` permite validar la autenticidad si se tiene configurado un metodo de seguridad.

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

Webhook configurable que envia las notificaciones de agenda al instante. Se configura informando la URL al equipo de integraciones (ver skill **Base**). El campo `hash` permite validar la autenticidad si se tiene configurado un metodo de seguridad.

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
  "ids": ["notificationId-1", "notificationId-2"],
  "externalClientId": "uuid-del-usuario"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| ids | String[] | Si | Coleccion de identificadores de notificaciones de agenda (`id` del notification). Maximo 10 |
| externalClientId | String | Si | Identificador unico del usuario final. **Debe ser el mismo** usado en todos los endpoints |

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

| Codigo | Estado | Mensaje | Solucion |
|--------|--------|---------|----------|
| idsError | 400 | Error: ids isn't an array | El campo `ids` no es un array o falta en el body. Enviar `ids` como array de strings |
| SDE04342 | 200 (in-response) | There is no pending debt | El notificationId es invalido o la deuda ya fue pagada. Verificar via `GET /notifications` |
| XCX05060 | 500 | There was an unknown error while executing the request | Reintentar con backoff |

---

### POST /payments/bulk

Permite pagar multiples deudas en una sola solicitud. Funciona similar a `/payment` de billPayment pero acepta una coleccion. Cada deuda se procesa de forma **independiente** (no es transaccional). La confirmacion llega via webhook por separado para cada pago.

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

| Codigo | Estado | Mensaje | Solucion |
|--------|--------|---------|----------|
| AGP0001 | 400 | The array should have at least one debt | `debtsToPay` falta o es un array vacio. Enviar al menos un elemento |
| SPA04649 | 200 (in-response) | The debt has already been processed | El `debtId` ya fue pagado. No reintentar |
| SPA04345 | 200 (in-response) | Debt not found | El `debtId` expiro. Ejecutar `POST /prepare-payment` nuevamente |
| XCX05060 | 500 | There was an unknown error while executing the request | Reintentar con backoff |

## Flujo de Pago desde Notificaciones

Hay dos opciones para pagar a partir de notificaciones:

1. **Flujo tradicional**: Usar `POST /prepare-payment` con el notificationId, obtener el `debtId`, y avanzar con `POST /payment` + webhook `confirmPayment`.
2. **Flujo bulk**: Usar `POST /prepare-payment` con los notificationIds, filtrar los SUCCESS, luego `POST /payments/bulk` con los debtIds obtenidos. La confirmacion llega por webhook individual para cada pago.

## Envio de Recordatorios

Los recordatorios se pueden recibir por dos vias:

1. **Webhook**: Envio instantaneo para un usuario particular (requiere configuracion con el equipo de integraciones).
2. **API**: Consulta bajo demanda via `GET /notifications/{externalClientId}`.

## Debito Automatico

Permite automatizar pagos recurrentes sin intervencion del usuario en cada ciclo. Requiere una adhesion existente y activa.

### Flujo

```
1. PATCH /automatic-debit (activar)
2. TAPI detecta nueva deuda
3. Webhook debit-incoming → Fintech
4. Fintech debita al usuario
5. POST /automatic-debit/confirm
6. TAPI confirma y cierra ciclo
```

### PATCH /automatic-debit

Activa o desactiva el debito automatico para una adhesion.

**Headers:**
- `x-authorization-token`
- `x-api-key` (API key del microservicio Agenda)

**Request:**
```json
{
  "agendaId": "externalClientId#modalityId#identifierValue",
  "subscribeToAutomaticDebit": true
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| agendaId | String | Si | Identificador unico de la adhesion |
| subscribeToAutomaticDebit | Boolean | Si | `true` para activar, `false` para desactivar |

**Response 200 OK:**
```json
{
  "agendaAdhesion": {
    "serviceIdentifier": "1000000000",
    "modalityId": "45d55ec4-aa8f-4cf9-9ff5-1d0d672a4318",
    "companyCode": "MX-S-00384",
    "alias": "",
    "type": "NEW_BILL",
    "agendaId": "test-agenda-001#45d55ec4-...#1000000000",
    "isAutomaticDebit": true,
    "isAdhered": true
  },
  "tx": "...",
  "mainTx": "..."
}
```

**Errores:**

| Codigo | HTTP | Mensaje | Solucion |
|--------|------|---------|----------|
| AGA0003 | 404 | There are no adhesions for the user | El `agendaId` no existe. Verificar con `GET /adhesions` |

---

### Webhook debit-incoming

Cuando TAPI detecta una nueva deuda para una adhesion con debito automatico activo, envia este webhook a la fintech.

**Payload:**
```json
{
  "type": "debit-incoming",
  "agendaId": "user-001#modalityId#identifierValue",
  "companyName": "CFE",
  "companyCode": "MX-S-00XXX",
  "amount": 500.00,
  "currencyCode": "MXN",
  "expirationDate": "2026-04-15",
  "taskToken": "eyJhbGciOiJIUzI1NiIs...",
  "hash": "abc123def456"
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| type | String | Siempre `"debit-incoming"` |
| agendaId | String | Identificador de la adhesion |
| companyName | String | Nombre de la empresa |
| companyCode | String | Codigo de la empresa |
| amount | Number | Monto a debitar |
| currencyCode | String | Moneda ISO 4217 (ej: `MXN`) |
| expirationDate | String | Fecha limite de pago (ISO date) |
| taskToken | String | **CRITICO**: Token que debe reenviarse en `POST /automatic-debit/confirm` |
| hash | String | Hash para validar autenticidad |

**IMPORTANTE**: El `taskToken` debe almacenarse de forma segura. Sin el, no es posible confirmar el debito a TAPI.

---

### POST /automatic-debit/confirm

Confirma a TAPI el resultado del debito automatico.

**Headers:**
- `x-authorization-token`
- `x-api-key` (API key del microservicio Agenda)

**Request:**
```json
{
  "agendaId": "user-001#modalityId#identifierValue",
  "taskToken": "eyJhbGciOiJIUzI1NiIs...",
  "status": "SUCCESS",
  "externalPaymentId": "uuid-v4-del-pago"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| agendaId | String | Si | Identificador de la adhesion |
| taskToken | String | Si | Token recibido en el webhook `debit-incoming` |
| status | String | Si | `"SUCCESS"` si el debito fue exitoso, `"FAILED"` si no se pudo debitar |
| externalPaymentId | String (UUID v4) | Solo si SUCCESS | ID unico del pago generado por la fintech |

**Response 200 OK:**
```json
{
  "message": "Confirmation received",
  "tx": "...",
  "mainTx": "..."
}
```

**Errores:**

| HTTP | Mensaje | Causa | Solucion |
|------|---------|-------|----------|
| 400 | Bad Request | Campos faltantes o invalidos | Verificar todos los campos requeridos |
| 404 | Not Found | `agendaId` o `taskToken` invalido | Verificar que el `taskToken` corresponda al webhook recibido |
| 409 | Conflict | Confirmacion duplicada (taskToken ya usado) | No reenviar; ya fue procesada |

---

## Sandbox: Notificaciones y Reprocess

En el ambiente de Sandbox, las notificaciones de agenda **NO se generan automaticamente**. Para forzar la generacion de notificaciones en sandbox, usar el microservicio **Tools**:

```
POST https://tools.homo.tapila.cloud/agenda/adhesions/reprocess
```

**Headers:**
- `x-authorization-token`
- `x-api-key` (API key del microservicio Tools)

**Request:**
```json
{
  "externalClientId": "uuid-del-usuario",
  "forceNotification": true
}
```

Esto forza a TAPI a consultar deudas de las adhesiones del usuario y generar notificaciones/webhooks. Solo disponible en sandbox; en produccion las notificaciones se generan automaticamente.

## Flujos Detallados

### Flujo de Adhesion (Alta)
```
1. Usuario paga un servicio con isSchedulable: true
   ↓
2. TAPI crea adhesion automaticamente (vinculo usuario-empresa-identificador)
   ↓
3. Webhook ADHESION_CREATED → Fintech recibe la nueva adhesion
   ↓
4. Mostrar en "Mis servicios" del usuario
```

**Alternativa: Adhesion manual (sin pago previo)**
```
1. Usuario quiere adherirse sin pagar → POST /adhesions/register
   ↓
2. TAPI crea adhesion manualmente
   ↓
3. Mostrar en "Mis servicios" del usuario
```

### Flujo de Notificaciones y Pago
```
1. TAPI detecta nueva deuda para una adhesion activa
   ↓
2a. Webhook AGENDA_NOTIFICATION → Fintech recibe la notificacion
   ↓ (alternativa)
2b. GET /notifications/{externalClientId} → Consultar notificaciones
   ↓
3. Mostrar notificacion al usuario (monto, empresa, vencimiento)
   ↓
4. Usuario decide pagar → POST /prepare-payment con notificationId(s)
   ↓  Convierte notificationId a debtId
   ↓
5a. Pago individual → POST /payment (microservicio Services) con debtId
5b. Pago multiple → POST /payments/bulk con debtIds
   ↓
6. Webhook confirmPayment o DELETE_NOTIFICATION confirma el pago
   ↓
7. Notificacion desaparece de la lista (source: "PAYMENT")
```

### Flujo de Debito Automatico
```
1. PATCH /automatic-debit → Activar debito automatico para una adhesion
   ↓
2. TAPI detecta nueva deuda
   ↓
3. Webhook debit-incoming → Fintech recibe monto + taskToken
   ↓
4. Fintech debita al usuario (logica propia)
   ↓
5a. Exito → POST /automatic-debit/confirm con status: "SUCCESS" + externalPaymentId
5b. Fallo → POST /automatic-debit/confirm con status: "FAILED"
   ↓
6. TAPI confirma y cierra ciclo
```

### Flujo de Gestion de Adhesiones
```
Pantalla "Mis servicios":
1. GET /adhesions/{externalClientId} → Listar adhesiones
   ↓
Activar/desactivar notificaciones:
2. PATCH /adhesions con isAdhered: true/false
   ↓
Cambiar alias:
3. PATCH /adhesions con alias: "Mi luz"
   ↓
Activar/desactivar debito automatico:
4. PATCH /automatic-debit con subscribeToAutomaticDebit: true/false
```

## Buenas Practicas

- Usar el mismo `externalClientId` en todos los flujos (billPayment, agenda, debito automatico)
- Guardar `agendaId`, `notificationId` y `taskToken` (debito automatico) para soporte y trazabilidad
- Validar que la adhesion este activa (`isAdhered: true`) antes de mostrarla al usuario
- Implementar el webhook de recordatorios para notificaciones en tiempo real
- Para pagos multiples via `/payments/bulk`, implementar logica de reembolso parcial en caso de fallo
- Para debito automatico, almacenar el `taskToken` de forma segura y confirmar siempre el resultado a TAPI
- En sandbox, usar `POST /agenda/adhesions/reprocess` con `forceNotification: true` para generar notificaciones de prueba
- Responder HTTP 200 a los webhooks inmediatamente, procesar logica de negocio asincronamente
- Implementar idempotencia en handlers de webhook (TAPI puede reenviar si no recibe 200)

## Preguntas Frecuentes (FAQs)

### Adhesiones

**La adhesion se crea automaticamente o la tengo que crear yo?**
Ambas opciones. Por defecto, se crea automaticamente tras un pago exitoso a una empresa con `isSchedulable: true`. TAPI puede configurar tu cuenta para deshabilitar adhesiones automaticas, en cuyo caso usar `POST /adhesions/register`.

**Como se si una empresa soporta adhesiones?**
En el detalle de la empresa, la modalidad tiene el campo `isSchedulable`. Si es `true`, soporta adhesiones. Si es `false`, no ofrecer funcionalidad de agenda.

**Que es el agendaId y como se forma?**
Formato: `{externalClientId}#{modalityId}#{identifierValue}`. Se genera automaticamente al crear la adhesion.

**Puedo desactivar una adhesion sin eliminarla?**
Si. Usar `PATCH /adhesions` con `isAdhered: false`. La adhesion permanece pero las notificaciones se detienen. Se puede reactivar con `isAdhered: true`.

**Las adhesiones desactivadas aparecen en GET /adhesions?**
No por defecto. Solo con el filtro `?allAdhesions=true`.

**Puedo modificar alias y estado en una sola llamada?**
Si. Enviar tanto `isAdhered` como `alias` en el mismo PATCH. Se actualizan atomicamente.

**El externalClientId debe ser el mismo que uso en POST /debts?**
Si, es CRITICO. Es el vinculo entre el flujo de pagos y el de agenda. Usar siempre el mismo ID por usuario final.

**Puedo hacer POST /adhesions/register sin que el usuario haya pagado nunca?**
Si, ese es el proposito del registro manual.

**Hay limite de adhesiones por usuario?**
No esta documentado un limite. En sandbox se probaron 5+ sin problemas.

### Notificaciones

**Cual es la diferencia entre GET /notifications y includeNotifications=true en GET /adhesions?**
`GET /notifications` devuelve una lista plana de todas las notificaciones. `GET /adhesions?includeNotifications=true` las agrupa dentro de cada adhesion. Usar /notifications para "Novedades" y /adhesions para "Mis servicios".

**Como uso el notificationId para pagar?**
El campo `id` de cada notificacion es el `notificationId`. Enviarlos como `ids[]` a `POST /prepare-payment`, que devuelve los `debtId` necesarios para pagar.

**Las notificaciones desaparecen despues de pagar?**
Si. TAPI envia un webhook `DELETE_NOTIFICATION` con `source: "PAYMENT"` y la notificacion deja de aparecer en `GET /notifications`.

**Que pasa si no pago antes del vencimiento?**
La notificacion puede recibir un `DELETE_NOTIFICATION` con `source: "EXPIRED"`. La adhesion sigue activa para el proximo periodo.

**Como genero notificaciones en sandbox?**
Usar `POST /agenda/adhesions/reprocess` en el microservicio Tools con `forceNotification: true`. No existe en produccion.

**Con que frecuencia TAPI genera notificaciones en produccion?**
Cuando detecta nueva deuda del biller. La frecuencia depende del ciclo de facturacion (mensual, bimestral, etc.). No son periodicas sino por evento.

**Que campos cambian entre tipos de notificacion?**
- `NEW_BILL`: amount, expirationDate (estimada), lastPaidDate
- `EXPIRATION`: amount, expirationDate (real, expirationDateWasEstimated: false)
- `PAY_AGAIN`: lastPaidDate, lastPaidAmount (sin monto de deuda)

**El webhook puede llegar mas de una vez?**
Si. TAPI reintenta si no recibe HTTP 200. Implementar idempotencia usando el `id` (notificationId) como clave.

**Que respondo al webhook de TAPI?**
HTTP 200. No se requiere un body especifico. Si no respondes 200, TAPI reintenta.

**Que valores tiene el campo source de DELETE_NOTIFICATION?**
`"PAYMENT"` (se pago), `"NO_DEBT"` (biller informo que no hay deuda), `"EXPIRED"` (deuda vencio).

### Debito Automatico

**Que es el taskToken y por que es critico?**
Identificador unico generado por TAPI para cada ciclo de debito. Se recibe en el webhook `debit-incoming` y debe reenviarse exactamente igual en `POST /automatic-debit/confirm`. Sin el, TAPI no puede vincular la confirmacion con el evento.

**Cuanto tiempo es valido el taskToken?**
No esta documentado el TTL exacto. Procesar y confirmar lo antes posible (minutos, no horas). Si expira, TAPI puede reenviar el webhook con un nuevo token.

**Que pasa si la fintech no puede debitar (fondos insuficientes)?**
Enviar `POST /automatic-debit/confirm` con `status: "FAILED"`. No enviar `externalPaymentId`. TAPI registra el fallo.

**El usuario puede desactivar el debito automatico?**
Si. Usar `PATCH /automatic-debit` con `subscribeToAutomaticDebit: false`. Ofrecer esta opcion siempre en la UI.

**Que pasa si desactivo la adhesion pero el debito automatico estaba activo?**
Al desactivar la adhesion (`isAdhered: false`), se detienen todas las funciones incluyendo debito automatico. No se reciben mas webhooks `debit-incoming` hasta reactivar.

**Puedo activar debito automatico para todas las adhesiones a la vez?**
No. El endpoint opera sobre una adhesion individual. Para activar en multiples adhesiones, iterar internamente.

**Cual es la diferencia entre debito automatico y la notificacion AGENDA_NOTIFICATION?**
AGENDA_NOTIFICATION: TAPI notifica deuda, el usuario decide si paga. Debito automatico: TAPI notifica y espera que la fintech debite automaticamente sin intervencion del usuario.

**El comportamiento es diferente en sandbox vs produccion?**
Si. En sandbox, el webhook `debit-incoming` NO se dispara automaticamente; usar `/reprocess` para simularlo. En produccion, se dispara automaticamente al detectar nueva deuda.

## Skills Relacionados

- [[base]] - Contexto general de TAPI
- [[auth]] - Autenticacion requerida
- [[servicios]] - Pago de los servicios adheridos (endpoints /payment y /debts)
