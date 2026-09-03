# FileBridge

Open-source file distribution hub. Move files **as-is** (any format) between endpoints.

Connectors:

- Cloud: OneDrive, Google Drive, Dropbox, Box
- Server: SFTP, FTP/FTPS, WebDAV, S3-compatible (AWS, R2, MinIO)
- Device: browser upload, HTTP(S) URL, download link for iPhone/iPad (Files app / Safari)

Any source can send to any destination that accepts writes.

UI is German. Code and this README are English.

## What it does

1. Sign in (Clerk)
2. Connect clouds, servers, or use this device / an iPhone download link
3. Pick a file on one side and a folder on the other
4. Stream the bytes in 8 MB chunks, with resume on the transfer job

Secrets (refresh tokens, SFTP passwords/keys) are encrypted with AES-256-GCM before they hit the database.

## Requirements

- Node.js 20+
- Optional later: Microsoft / Google / Dropbox / Box OAuth apps for those clouds

## Setup

```bash
npm install
npm run setup
npm run db:push
npm run dev
```

That creates Clerk development keys (no account needed), a local file database (no Docker), and `FILEBRIDGE_KMS_KEY`. Then open [http://localhost:3000](http://localhost:3000).

To use a real Postgres later, set `DATABASE_URL=postgres://...` in `.env.local` and run `npm run db:push` again.

### Vercel (your hosted instance)

The CLI must be logged in on this machine (`npx vercel login`). Then:

```bash
npx vercel link
npx vercel integration add clerk --yes --no-claim
npx vercel integration add neon --yes --no-claim
# Blob is optional — not required for OneDrive ↔ SFTP
npx vercel env add FILEBRIDGE_KMS_KEY
npx vercel env add APP_URL
npx vercel env add MICROSOFT_CLIENT_ID
npx vercel env add MICROSOFT_CLIENT_SECRET
npx vercel env pull .env.local --yes
npm run db:push
```

Self-hosters skip Marketplace: any Postgres URL, Clerk keys from clerk.com, same variable names.

## Security patches

- Dependabot for npm and GitHub Actions
- CI runs `lint`, `typecheck`, tests, and `npm audit --audit-level=high`
- CodeQL on JavaScript/TypeScript
- See [SECURITY.md](SECURITY.md) to report a vulnerability

## Add a connector

Implement `Connector` in `lib/connectors/<name>.ts`. Do not add a plugin system. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
