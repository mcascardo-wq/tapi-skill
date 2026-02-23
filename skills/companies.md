# TAPI Companies

## Que es

El modulo de Companies es el primer paso en el flujo de integracion tanto para pago de servicios como para recargas. Provee el catalogo de empresas disponibles para operar, organizado en una estructura jerarquica de hasta 3 niveles.

El token de autenticacion determina automaticamente el pais y el cliente, por lo que la respuesta solo incluye empresas habilitadas para ese contexto.

## Estructura Jerarquica

### Nivel 1: Company

La empresa o prestador del servicio. Cada company incluye:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| companyCode | String | Identificador unico de la empresa (ej: `MX-S-90227`, `AR-R-0001`) |
| companyName | String | Nombre de la empresa |
| companyLogo | String | URL del logo de la entidad |
| companyType | String | `SERVICE` o `RECHARGE` |
| tags | String[] | Categorias asociadas (ej: `INTERNET, TELEFONIA Y TV`) |
| active | Boolean | Si la empresa esta habilitada |

### Nivel 2: Modalidades (Servicios) / Productos (Recargas)

**Para servicios**, las modalidades representan diferentes formas de identificar la deuda de un usuario:

| modalityType | Descripcion |
|--------------|-------------|
| input | Ingreso manual de una referencia (habilita teclado al usuario) |
| barcode | Codigo de barras de la factura |
| qr | Codigo QR (disponible solo en Argentina en produccion) |
| image | Imagen de la factura |

Cada modalidad incluye:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| modalityId | UUID | Identificador unico de la modalidad |
| modalityType | String | Tipo de modalidad (`input`, `barcode`, `qr`, `image`) |
| modalityTitle | String | Titulo descriptivo |
| modalityDescription | String | Descripcion de la modalidad |
| active | Boolean | Si esta habilitada |
| isSchedulable | Boolean | Si soporta adhesiones en agenda (ver seccion abajo) |
| status | String | Estado de la modalidad |
| queryData | Object[] | Tercer nivel con datos del identificador |

**Para recargas**, los productos representan los diferentes paquetes disponibles:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| productId | String | Identificador del producto |
| productType | String | Tipo de producto (ej: `RECARGA_SALDO`) |
| productDescription | String | Descripcion del paquete |
| amountType | String | `OPEN` (monto variable), `CLOSED` (monto fijo) o `FIXED` (lista de montos) |
| amount | Number | Monto por defecto |
| minAmount | Number | Monto minimo |
| maxAmount | Number | Monto maximo |
| allowedAmounts | List | Montos permitidos (solo para `FIXED`) |
| active | Boolean | Si el producto esta habilitado |

### Nivel 3: Query Data

Dentro de cada modalidad (servicios) o a nivel de company (recargas), el query data define las caracteristicas del identificador que debe ingresar el usuario:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| identifierName | String | Nombre tecnico del identificador. Debe viajar en la consulta de deuda o pago de recarga |
| description | String | Nombre visible del identificador (ej: "Numero de cliente", "Codigo de barras") |
| dataType | String | Tipo de dato: `NUM` (numerico), `ALF` (alfanumerico), `FEC` (fecha), `IMP` (importe), `CBA` (codigo de barras) |
| minLength | Number | Longitud minima del identificador |
| maxLength | Number | Longitud maxima del identificador |
| helpText | String | Texto de ayuda para mostrar en el frontend |
| component | String | Tipo de componente sugerido (ej: `TEXT_FIELD`) |
| position | Number | Posicion del campo cuando hay multiples identificadores |
| inline | Boolean | Si el campo se muestra en linea |

El `identifierName` es clave: es el campo que viaja despues en la API de consulta de deuda (`POST /debts`) o pago de recarga (`POST /payment`).

## isSchedulable y la Agenda

El campo `isSchedulable` a nivel modalidad indica si la empresa/modalidad soporta adhesiones en la agenda de TAPI:

- **`isSchedulable: true`**: Se pueden guardar adhesiones y generar notificaciones de nuevos vencimientos. El identificador del usuario es estable mes a mes.
- **`isSchedulable: false`**: No soporta agenda. Puede ser porque el identificador cambia cada periodo de facturacion, o porque el biller no devuelve el monto adeudado.

Solo las modalidades con `isSchedulable: true` deben mostrarse como opcion para adherirse a recordatorios.

## URLs Base

| Ambiente | URL |
|----------|-----|
| Sandbox | `https://companies.homo.tapila.cloud` |
| Produccion | `https://companies.tapila.cloud` |

## Endpoints

### GET /services

Obtiene el catalogo de empresas de servicios. Ver skill de **Servicios** para detalle completo.

### GET /recharges

Obtiene el catalogo de empresas de recargas. Ver skill de **Recargas** para detalle completo.

### GET /{companyCode}

Obtiene la informacion de una empresa particular ingresando su codigo.

**Headers:**
- `x-authorization-token`: Token JWT
- `x-api-key`: API key del servicio de Company

**Path Params:**
- `companyCode`: Codigo de la empresa (ej: `AR-S-0003`, `MX-R-00028`)

### GET /services/popular

Devuelve las empresas con mayor volumen de transacciones, incluyendo logo, nombre y companyCode. Util para armar la pantalla principal del flujo de pago.

### Busqueda con Query Params

Se puede filtrar el catalogo usando query params:

| Param | Descripcion |
|-------|-------------|
| searchCompany | Filtrar por nombre (minimo 3 caracteres) |
| tag_id | Filtrar por categoria |
| limit | Cantidad de empresas por pagina |
| page | Numero de pagina |
| active | Filtrar por estado (default: `true`) |

### GET /tags

Obtiene las categorias disponibles para filtrar empresas.

**Response:**
```json
{
  "tags": [
    { "id": 168, "name": "SERVICIO DE AGUA" },
    { "id": 175, "name": "TV POR CABLE" }
  ]
}
```

## Cacheo y Actualizacion

El catalogo de empresas suele estar cacheado del lado de TAPI. Se recomienda:

- **Guardar el catalogo localmente** y refrescarlo cada aproximadamente **1 hora**
- **No consultar el catalogo en cada request** del usuario
- Mantener el catalogo actualizado es fundamental: se suman nuevas empresas o se modifican las existentes por cambios de los billers
- La actualizacion del catalogo es parte del proceso de **homologacion** antes de salir a produccion

## Recomendaciones para el Frontend

- **Mostrar empresas populares primero**: 10-15 empresas concentran el ~80% del volumen de transacciones. Usar `GET /services/popular` para obtenerlas
- **Agregar un buscador**: Permitir al usuario buscar por nombre usando el param `searchCompany`
- **Mostrar logos**: Siempre mostrar el `companyLogo` para facilitar el reconocimiento visual
- **Mostrar helpText**: En la pantalla de ingreso de referencia, mostrar el `helpText` del queryData para guiar al usuario
- **Validar antes de enviar**: Usar `minLength`/`maxLength` y `dataType` del queryData para validar el input del usuario antes de consultar deuda o procesar recarga

## amountType por Pais (Recargas)

El comportamiento del `amountType` varia segun el pais:

| Pais | Comportamiento |
|------|----------------|
| Mexico | Predominantemente paquetes `CLOSED` (montos fijos) |
| Argentina, Colombia, Peru, Chile | Mix de `OPEN` (monto variable) y `CLOSED` (monto fijo) |

Para `OPEN`, el usuario elige un monto entre `minAmount` y `maxAmount`. Para `CLOSED`, el monto es fijo e igual a `amount`. Para `FIXED`, solo se permiten los valores de `allowedAmounts`.

## Errores

| HTTP | Codigo | Mensaje | Causa | Solucion |
|------|--------|---------|-------|----------|
| 404 | XCX04325 | Company not found | El `companyCode` no existe o la empresa esta inactiva | Verificar el codigo contra el catalogo actualizado (`GET /services` o `GET /recharges`) |

## Flujo Detallado: Integracion del Catalogo

### Flujo para Servicios (bill payment)
```
1. GET /services → Obtener catalogo completo de empresas
   ↓
2. (Opcional) GET /services/popular → Empresas mas usadas por categoria
   ↓
3. (Opcional) GET /tags → Categorias para organizar la UI
   ↓
4. Usuario selecciona empresa
   ↓
5. GET /{companyCode} → Detalle con modalidades y queryData
   ↓
6. Mostrar formulario dinamico segun queryData de la modalidad elegida
   ↓
7. Validar input del usuario (minLength, maxLength, dataType)
   ↓
8. Continuar al flujo de consulta de deuda (POST /debts en servicios)
```

### Flujo para Recargas
```
1. GET /recharges → Obtener catalogo completo de empresas + productos
   ↓
2. Usuario selecciona empresa
   ↓
3. Mostrar productos disponibles (con amountType, rango de montos)
   ↓
4. Usuario selecciona producto y monto
   ↓
5. Validar identificador (numero de telefono, etc.)
   ↓
6. Continuar al flujo de pago (POST /payment en recargas)
```

### Como renderizar un formulario dinamico a partir de queryData

1. **Filtrar modalidades activas**: Solo `active: true` y `status: "live"`
2. **Ordenar campos**: Usar `position` para determinar el orden (0 = primero)
3. **Determinar tipo de control**: Usar `component` (`TEXT_FIELD` = campo de texto, `COMBO_BOX_ESTATICO` = dropdown)
4. **Configurar validacion**: `dataType` para tipo de teclado (`NUM` = numerico, `ALF` = alfanumerico, `FEC` = date picker, `CBA` = barcode scanner), `minLength`/`maxLength` para limites, `regex` para validacion adicional
5. **Mostrar ayuda**: `helpText` como placeholder/ayuda, `helpTextImage` como imagen de referencia (ej: foto de factura)
6. **Para COMBO_BOX_ESTATICO**: Las opciones estan en `identifierValue` como mapa `{"clave": "texto visible"}`. Enviar la **clave**, no el texto

## Buenas Practicas

- Cachear el catalogo localmente y refrescar cada ~1 hora (sincronizacion diaria completa recomendada)
- No hardcodear companyCode: obtenerlos siempre del catalogo
- Validar el identificador del usuario contra el queryData antes de enviar requests
- Mostrar las empresas populares para mejorar la experiencia del usuario
- Verificar `isSchedulable` antes de ofrecer adhesion a la agenda
- Recordar que el token determina pais y cliente automaticamente
- Filtrar modalidades: solo mostrar las que tengan `active: true` y `status: "live"`
- Implementar fallback visual cuando `companyLogo` es null (inicial del nombre en circulo de color)

## Preguntas Frecuentes (FAQs)

**Con que frecuencia debo refrescar el catalogo?**
Se recomienda una sincronizacion diaria completa via `GET /services` (default 5000 registros por pagina). Para busquedas durante la sesion del usuario, usar `searchCompany` contra la API en tiempo real.

**Cual es la diferencia entre empresas SERVICE y RECHARGE?**
Las empresas `SERVICE` requieren consulta de deuda (`POST /debts`) antes del pago. Las empresas `RECHARGE` tienen productos con montos predefinidos y van directo al pago. El prefijo del `companyCode` lo indica: `MX-S-` para servicios, `MX-R-` para recargas.

**Que hago si una modalidad esta inactiva dentro de una empresa activa?**
Si una modalidad tiene `active: false` o `status` diferente de `"live"`, no mostrarla al usuario. Ejemplo: una empresa puede tener la modalidad barcode deshabilitada pero la de input activa.

**Que significa isSchedulable y como afecta la UI?**
`isSchedulable: true` permite ofrecer "Pagar automaticamente" o "Recordarme cuando haya nueva deuda". Con `false`, solo pago unico inmediato. Se evalua por modalidad, no por empresa.

**Que hago cuando companyLogo es null?**
Implementar fallback visual: mostrar la primera letra del nombre en un circulo de color, o un icono generico basado en el tag de la empresa.

**Como funciona la paginacion en /services?**
Usa parametros `page` y `limit`. El campo `links` en la respuesta indica si hay mas paginas (si contiene `rel: "next"`). El default de `limit` es 5000 registros.

**Cuales son los valores posibles de companyType?**
`SERVICE` (empresas de servicios, prefijo `MX-S-`) y `RECHARGE` (empresas de recargas, prefijo `MX-R-`).

**Que son los productos en las empresas de recargas?**
Cada empresa de recarga tiene un array de `products`. Cada producto tiene `productId` (necesario para POST /payment), `amountType` (CLOSED/OPEN/FIXED), y rango de montos.

**Que informacion contiene additionalData en productos de recargas?**
Cuando existe, contiene `packageInformation` con beneficios del paquete: `internet` (datos), `callMinutes`, `messagesNumber`, `socialMedia`. Puede ser null.

## Skills Relacionados

- [[base]] - Contexto general de TAPI
- [[auth]] - Autenticacion requerida (headers x-authorization-token y x-api-key)
- [[servicios]] - Pago de servicios (usa el catalogo de companies como primer paso)
- [[recargas]] - Recargas moviles (usa el catalogo de companies como primer paso)
- [[agenda]] - Adhesiones y notificaciones (depende de isSchedulable)
