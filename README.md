# actual-server

Backend API-first para registrar usuarios, asociar tokens APNs de iOS, sincronizar cuentas de Actual Budget cada mañana y detectar movimientos nuevos.

## Stack

- NestJS + TypeScript
- SQLite local con `better-sqlite3`
- Scheduler local con `node-cron`
- APNs HTTP/2 vía `@parse/node-apn`

## Arranque local

```bash
npm install
cp .env.example .env
npm run db:setup
npm run start:dev
```

En otra terminal:

```bash
npm run dev:scheduler
```

API docs: `http://localhost:3000/docs`

## Persistencia y cola

- SQLite guarda usuarios, tokens de dispositivos, cuentas Actual configuradas, movimientos vistos, movimientos nuevos y notificaciones. Por defecto usa `SQLITE_PATH=./data/actual-server.db`.
- El scheduler se ejecuta en proceso con `node-cron`; no requiere servicios locales adicionales.
- `npm run db:setup` es idempotente: aplica [db/schema.sql](./db/schema.sql) con `CREATE TABLE IF NOT EXISTS`.

## Flujo básico

1. `POST /auth/register`
2. `POST /devices` con el token APNs que entrega iOS
3. `POST /actual-accounts` para registrar una cuenta Actual Budget concreta
4. El scheduler ejecuta la sincronización diaria según `FETCH_CRON`
5. Para cada cuenta activa llama a bank sync y después descarga movimientos
6. Los movimientos que no existían antes quedan disponibles en `GET /actual-transactions/new`

## Actual Budget

Registrar una cuenta Actual para el usuario autenticado:

```http
POST /api/actual-accounts
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "name": "Cuenta corriente",
  "baseUrl": "https://actual.example.com/v1",
  "apiKey": "actual-api-key",
  "budgetSyncId": "budget-sync-id",
  "accountId": "actual-account-id",
  "budgetEncryptionPassword": "optional"
}
```

La respuesta no devuelve secretos: `apiKey` y `budgetEncryptionPassword` salen como `redacted`.

Endpoints usados contra Actual:

- `POST /budgets/{budgetSyncId}/accounts/{accountId}/banksync`
- `GET /budgets/{budgetSyncId}/accounts/{accountId}/transactions`

Headers:

- `x-api-key: <apiKey>`
- `budget-encryption-password: <password>` cuando aplique

El listado de movimientos usa:

```env
ACTUAL_TRANSACTIONS_SINCE_DATE=1900-01-01
ACTUAL_TRANSACTIONS_PAGE_LIMIT=100
```

La primera sincronización de una cuenta se usa como baseline y no marca todos los movimientos como nuevos. En sincronizaciones posteriores, los movimientos desconocidos quedan expuestos en `GET /actual-transactions/new`.

## Jobs

Lanzar sincronización manual de todas las cuentas activas:

```http
POST /api/jobs/run-now
x-admin-api-key: <ADMIN_API_KEY>
Content-Type: application/json

{}
```

Lanzar sincronización manual de una cuenta configurada:

```json
{
  "actualAccountId": "local-actual-account-id"
}
```

Consultar movimientos nuevos:

```http
GET /api/actual-transactions/new?limit=100
Authorization: Bearer <token>
```

Filtros opcionales:

- `actualAccountId`
- `limit`, máximo 500
- `includeAcknowledged=true`

## APNs

Para enviar pushes reales, configura:

```env
PUSH_DRY_RUN=false
APNS_KEY_ID=...
APNS_TEAM_ID=...
APNS_TOPIC=com.tu.bundle.id
APNS_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APNS_PRODUCTION=false
```

En desarrollo déjalo en `PUSH_DRY_RUN=true` para probar todo el flujo sin contactar con Apple.
