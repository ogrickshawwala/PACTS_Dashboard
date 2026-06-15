# PACTS Dashboard

Operations console for **PACTS** (Production Administration & Configuration
Tracking System). React + Material UI, dark industrial theme per the
Frontend Design Specification (70% Grafana / 20% Unreal Editor / 10% GitLab,
company black + yellow).

## Stack

Vite · React 19 · TypeScript · Material UI · React Router

## Setup

```powershell
npm install
copy .env.example .env
npm run dev          # http://localhost:5173
```

The PACTS server must be running (default `http://127.0.0.1:1800`) and must
allow this origin via `PACTS_CORS_ORIGINS` in its `.env`.

## Environment configuration

`VITE_PACTS_API_URL` in `.env` is the only place the backend endpoint exists.
Local / LAN / AWS stage changes are a one-line config edit, never code.

## Pages

| Page | Purpose |
|---|---|
| Dashboard | Current Dev / Approved / Production versions, recent activity |
| Configurations | Primary workspace: search, filter, create, edit values (type-aware, validation-aware), deprecate |
| Version Control | Publish → Approve → Promote lifecycle, rollback with mandatory reason, version comparison |
| Audit Logs | Full operational history with filtering |

The top bar always shows the environment indicator (DEV / APPROVED / PROD
version chips) and the global Publish button. The acting-user field feeds the
`X-PACTS-User` audit header until real authentication lands in Phase 3.

## Phase 2 scope notes

- No authentication yet (Phase 3: JWT + roles — Designer approves, Admin promotes).
- Publish is snapshot-based: edits on the Configurations page change the
  Development working values; Publish freezes them into an immutable version.

## Build

```powershell
npm run build        # type-checks and outputs dist/
```
