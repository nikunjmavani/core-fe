# Load tests (k6)

[k6](https://k6.io/) scripts for load and smoke testing. These run **outside** the app (via the k6 binary) and target your API or frontend URL.

## Prerequisites

- Install k6: [https://k6.io/docs/get-started/installation/](https://k6.io/docs/get-started/installation/)

## Run

```bash
# Smoke (minimal check) — set BASE_URL if needed
k6 run tests/load/smoke.js

# Or use the npm script (same thing)
pnpm test:load
```

## Environment

- **BASE_URL** — Target base URL (e.g. `http://localhost:5173` or your API base). Default in scripts is often `http://localhost:5173`.

Scripts use k6’s `__ENV` or `environment` options; see each script for details.

## Adding scenarios

Add new `.js` (or k6-compatible) files under `tests/load/`. Run with:

```bash
k6 run tests/load/<script>.js
```
