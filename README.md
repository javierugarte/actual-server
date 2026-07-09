# actual-server

Backend API-first para registrar usuarios, asociar tokens APNs de iOS, consultar fuentes externas cada mañana y notificar novedades.

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

- SQLite guarda usuarios, tokens de dispositivos, fuentes, items vistos, ejecuciones y notificaciones. Por defecto usa `SQLITE_PATH=./data/actual-server.db`.
- El scheduler se ejecuta en proceso con `node-cron`; no requiere servicios locales adicionales.
- `npm run db:setup` es idempotente: aplica [db/schema.sql](./db/schema.sql) con `CREATE TABLE IF NOT EXISTS`.

## Flujo básico

1. `POST /auth/register`
2. `POST /devices` con el token APNs que entrega iOS
3. `POST /sources` para asociar una URL al usuario
4. El scheduler crea un job diario según `FETCH_CRON`
5. El proceso de scheduler llama por `POST` a `DATA_SERVICE_URL`, detecta items nuevos y envía push si `PUSH_DRY_RUN=false`

## Servicio externo

El proceso de scheduler no llama directamente a la URL de cada fuente. Llama a un único servicio configurado por entorno:

```env
DATA_SERVICE_URL=https://api.example.com/updates
```

Body enviado:

```json
{
  "userId": "user-id",
  "userSourceId": "subscription-id",
  "sourceId": "source-id",
  "sourceUrl": "https://example.com/feed.json",
  "label": "Example feed",
  "lastFetchedAt": "2026-07-09T08:00:00.000Z",
  "itemKeyPath": "id",
  "titlePath": "title"
}
```

La respuesta puede ser un array o un objeto con `items`, `data` o `results`.

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
