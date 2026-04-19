# Astro Publisher

Astro Publisher ist ein `pre-alpha` Redaktionssystem fuer strukturierte Inhalte auf Basis von Astro.

Ziel ist eine schlanke, mandantenfaehige Admin-Plattform, mit der Inhalte fuer statische Astro-Websites gepflegt und beim Build ueber eine API in Astro integriert werden koennen.

## Status

Dieses Repository ist im sehr fruehen Stand:

- `pre-alpha`
- kein produktionsreifer Auth-Flow
- Medien-Upload aktuell nur teilweise vorbereitet
- Datenmodell, API, Admin-MVP und Astro-Adapter sind als Grundlage vorhanden

## Architektur

- `apps/admin`: Svelte-basiertes Admin-Frontend
- `apps/api`: Cloudflare Worker API fuer Auth, Tenant- und Post-Logik
- `packages/core`: gemeinsame Typen, Zod-Schemas, Generator- und Validierungslogik
- `packages/astro-adapter`: Fetch- und Validierungsschicht fuer Astro-Projekte

## Lokale Entwicklung

Voraussetzungen:

- Node.js 18+
- `pnpm`

Kommandos:

```bash
pnpm install
pnpm dev
pnpm dev:api
pnpm build
```

## Hinweis

`docs/` ist lokal vorhanden, aber absichtlich nicht Teil des Git-Repositories.
