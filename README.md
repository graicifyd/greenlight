# Greenlight

A pink, couples-friendly cycle tracker for enjoying intimacy without the pregnancy worry. Every day is either a **yes day** (relax and enjoy) or a **careful day** (use a condom or wait), and both partners see the same answer on their own phone. She logs just her period, optional LH tests and intimacy — no temperatures, no mucus checks.

Greenlight is not a contraceptive device or medical advice. The calendar method is less reliable than hormonal or barrier contraception.

## How days are decided

Greenlight uses a conservative calendar method. A day is careful unless cycle history says otherwise.

- **Fertile window** — (shortest cycle − 20) through (longest cycle − 9). Without history the typical cycle length is used (28 days → days 8–19).
- **Early yes days** — only once one full cycle is logged, never past day 5 and never inside the fertile window. **Extra safe** mode removes them.
- **LH tests** — a positive test keeps that day and the following three careful.
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
