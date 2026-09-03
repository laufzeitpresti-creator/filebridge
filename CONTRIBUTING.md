# Contributing

FileBridge is an open-source transfer hub. Keep the surface small so security patches stay easy.

## Ground rules

- One connector is one file behind `lib/connectors/types.ts`. Do not add a plugin framework.
- Treat files as opaque bytes. No format conversion.
- Do not add an SDK when `fetch` is enough (Microsoft Graph is a good example).
- Secrets never go in git, docs, or screenshots.
- UI copy is German. Code, comments, and this repo’s docs are English.

## Setup

1. Copy `.env.example` to `.env.local` and fill in Clerk, `DATABASE_URL`, and `FILEBRIDGE_KMS_KEY`.
2. Start Postgres: `docker compose up -d`
3. Push the schema: `npm run db:push`
4. Run the app: `npm run dev`

You need a [Microsoft Azure app](https://portal.azure.com) with Graph permissions `Files.ReadWrite.All` and `offline_access` for OneDrive.

## Checks before a PR

```bash
npm run lint
npm run typecheck
npm test
npm run audit
```

## Connector checklist

A new endpoint should:

1. Implement `Connector` in `lib/connectors/<name>.ts`
2. Register it in `lib/connectors/catalog.ts` and `lib/connectors/resolve.ts`
3. Store only encrypted config in `connections.encryptedConfig`
4. Stream reads and writes — do not buffer whole files
5. Come with German labels in the dashboard

## Security reports

See [SECURITY.md](SECURITY.md). Do not file public issues for credential leaks.
