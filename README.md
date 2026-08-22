# Cleanvee Operations

Cleanvee is a permanent proof-of-clean operations workspace for cleaning teams. It provides a role-aware daily workflow for `user` members and a protected **Admin Mode** for `admin` operators to manage buildings, checkpoints, team access, assignments, and operational rules.

## Live application

[Open Cleanvee Operations](https://cleanveeops-j6ep8cxf.manus.space/)

## Application architecture

The application uses React 19, TypeScript, Vite, Tailwind CSS, Express, tRPC, Drizzle ORM, and MySQL. Authentication is handled through Manus OAuth. The persistent backend is designed around assignment-scoped operational data: non-admin users work only with their active site assignments, while server-side procedures enforce administrator-only configuration and proof-decision actions.

## Workspace capabilities

The authenticated workspace provides six connected tabs: **Shift**, **Review**, **Sites**, **Reports**, **Team**, and **Settings**. Administrators can enter **Admin Mode** to configure buildings and checkpoints, invite and assign team members, manage roles, and update live operational rules. A first-time administrator is directed to building setup so an empty workspace has an immediate configuration action.

## Development

```bash
pnpm install
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Database changes are defined in `drizzle/schema.ts`. Generate migrations with Drizzle, review the generated SQL, and apply it to the configured MySQL database before deploying application code that depends on the change.

## Environment and deployment

Do not commit credentials or `.env` files. The managed deployment environment supplies database, OAuth, JWT, and platform integration values. Review `server/_core/env.ts` before introducing a new environment variable.

## Quality checks

The repository includes authorization, workflow, role-navigation, live-refresh, and mounted UI regression tests. UI-quality evidence and outstanding external browser acceptance are documented in `UI_QUALITY_REPORT.md` and `BROWSER_AND_AUTH_ACCEPTANCE_MATRIX.md`.
