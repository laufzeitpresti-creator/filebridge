# Security Policy

## Supported versions

Security fixes land on `main`. If you run a fork or an older tag, please rebase onto `main` before reporting that a patch is missing.

## Reporting a vulnerability

Do **not** open a public GitHub issue for:

- leaked credentials, tokens, or private keys
- unauthenticated access to files or connections
- injection or path-traversal in connectors
- crypto / secret-storage bugs

Email the maintainer through the GitHub profile on this repository, or use GitHub **Private vulnerability reporting** if it is enabled.

Please include:

1. A short description of the impact
2. Steps to reproduce (no production secrets)
3. Affected commit or version

You should hear back within 7 days. Please give us a reasonable window to patch before any public write-up.

## What we do not want in issues or PRs

- Real OneDrive refresh tokens, SFTP passwords, or private keys
- Azure client secrets
- `.env.local` dumps
- Screenshots that show live credentials

Use placeholders. The example env file is the only env file that belongs in git.

## Sessions, passwords, login

- Passwords are hashed and stored by **Clerk**. This app never stores user passwords.
- Session cookies are issued by Clerk (`HttpOnly`, `Secure` in production, `SameSite=Lax`). Confirm that in the Clerk dashboard.
- Enable **Clerk Bot Protection** and login rate limiting in the Clerk dashboard. API mutations in this app are additionally rate-limited.

## Database

- `DATABASE_URL` is server-only. There is no public DB key in this stack.
- Connector secrets are encrypted with AES-256-GCM (`FILEBRIDGE_KMS_KEY`) before insert.
- All queries go through Drizzle (parameterized). Tenant rows are always filtered by the authenticated `userId`.
- Optional production RLS: apply `drizzle/rls.sql` with a non-owner database role.

## HTTP

- Production Postgres connections require TLS.
- Vercel (and this app's HSTS header) force HTTPS.
- Security headers live in `lib/security/headers.ts`.
- User-supplied HTTP/WebDAV URLs are blocked from private/loopback targets (SSRF).

## Dependency patches

- Dependabot opens weekly PRs for npm and GitHub Actions, and immediate PRs for known security advisories.
- CI fails on `npm audit --audit-level=high`.
- Prefer official patches over pinning forever. If a CVE has no patch yet, document the risk in the Dependabot PR instead of disabling the audit.
