# Greenlight

A fertility-awareness tracker for couples, built to **avoid** pregnancy. Every day is either **green** (lower-risk) or **red** (use a condom or wait), and both partners see the same answer on their own phone.

Greenlight is a fertility-awareness aid, not a contraceptive device or medical advice.

## How days are decided

Greenlight uses a conservative symptothermal ruleset (in the spirit of Sensiplan / the double-check method). A day is red unless logged data proves otherwise.

- **Temperature shift** — a coverline is drawn above the highest of the 6 normal readings before a rise. Three readings above it, the third at least 0.2 °C higher, confirm ovulation. Disturbed readings are skipped; one dip is tolerated; a failed rise is discarded.
- **Mucus peak** — the last watery / egg-white day is peak; three drier days confirm it. With mucus tracking on, luteal green starts the evening of the *later* of the two confirmations. Temperature-only mode waits one extra day.
- **Early-cycle green** — only when history allows: never past day 5, never past (earliest first high − 8), never past (shortest cycle − 20), and never once mucus appears. A first cycle, or a cycle after one without a confirmed rise, has no early green days. **Strict** mode removes early green days entirely.
- **LH tests** — a positive test keeps the following three days red.
- **Predictions** are striped and clearly labelled; they are for planning only.

The engine lives in `src/engine/engine.ts` and is covered by `src/engine/engine.test.ts`.

## Stack

- Vite + React + TypeScript + Tailwind v4 (client, `src/`)
- Express 5 + Node's built-in `node:sqlite` (sync server, `server/`)
- Vitest, Oxlint

## Run it

```sh
npm install
npm run dev        # web on :5173, API on :3001 (proxied under /api)
```

Other scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm start` (API only, serves nothing static).

Data is stored in `./data/greenlight.db` (override with `GREENLIGHT_DATA_DIR`). API port: `PORT`.

## Couples

One person starts a tracker and gets a 6-character invite code (More → Partner). The other joins with the code (or opens `/?join=CODE`). Both see the same status, calendar and chart; either can log. The partner's Today view uses relationship-oriented language and support tips instead of asking them to log observations.
