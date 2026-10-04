---
name: testing-greenlight
description: How to set up and end-to-end test the Greenlight couples fertility app locally — multiple partner browser contexts, demo-data oracle values, mobile-viewport tricks, and state inspection without API calls.
---

# Testing Greenlight end-to-end

## Dev server
`cd /Users/devin/repos/greenlight && npm install && npm run dev` — Vite web on `http://localhost:5173`, Express API on `:3001` (same-origin under `/api` via the Vite proxy). SQLite DB is `./data/greenlight.sqlite`; delete `data/greenlight.sqlite*` for a clean slate. First Vite load after a lockfile change can take ~30–60s (dependency re-optimization) — wait, don't debug it.

## Simulating the two partners
Client auth lives in `localStorage` (key `greenlight.state`, a `RemoteState` with `members`, `logs`, `settings`). Launch separate Chrome profiles, each with its own debugging port, e.g.:
```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 --user-data-dir=/tmp/gl-chrome-a --no-first-run
```
and 9223/9224 for partner / third-join contexts. The partner joins via `http://localhost:5173/?join=CODE` (code on the cycling member's More screen) — the code field pre-fills. A third join on a full couple must be rejected with "This couple already has two members".

Read state without touching authed APIs via CDP `Runtime.evaluate` of `localStorage.getItem("greenlight.state")` on each port (target `type==="page"` from `http://localhost:PORT/json/list`). Partner sync is ~8s polling (`POLL_MS` in `src/lib/store.tsx`), so partner-visible changes land within ~15s without reload.

## UI interaction gotchas
- The bottom nav is `position:fixed`. a11y `press` on Log-screen buttons near the bottom of the scroll area intermittently hits the nav instead (e.g. pressing "LH Positive" navigated to Wins). Scroll the target to mid-viewport first, or use a raw `left_click` at its coordinates.
- Refs go stale after any tab switch or navigation — re-query. The tabs are `Today`, `Log`, `Calendar`, `Wins`, and `More`.
- To maximize a window, prefer AppleScript/System Events on the specific Chrome PID (`first process whose unix id is PID`); multiple `--user-data-dir` Chromes can make the generic `Google Chrome` process and menu Zoom target the wrong window.
- `/tmp` Chrome profiles and helper scripts may disappear after a system restart or session suspension. Treat profile state as disposable; recreate couples or seed localStorage again rather than assuming the browser session survived.

## Mobile viewport (~390px)
macOS Chrome clamps window width to ~500px minimum, and `Emulation.setDeviceMetricsOverride` may not apply in the headed session. Use headless Chrome instead:
```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless=new \
  --remote-debugging-port=9225 --user-data-dir=/tmp/gl-headless http://localhost:5173/
```
then `Emulation.setDeviceMetricsOverride {width:390,height:844,deviceScaleFactor:2,mobile:true}` — verify `innerWidth===390`, click tabs via `Runtime.evaluate` (`[...document.querySelectorAll("nav button")].find(b=>b.textContent.trim()==="Wins")?.click()`), and `Page.captureScreenshot` per tab. Check `document.documentElement.scrollWidth === innerWidth` for horizontal overflow. To reuse an existing headed profile in headless Chrome, copy both `greenlight.state` and `greenlight.token` into localStorage (remember to `JSON.parse` the object returned by `Runtime.evaluate` before iterating it), then reload.

## Demo-data oracle (src/engine/demo.ts)
"Explore with demo data" seeds 4 completed cycles + a current cycle at **day 11 → Careful day**, fertile window **days 7–21**, next Yes day in **11 days**, **4 victories / 6 badges**, and history range **27–30**. Early Yes days 1–5 exist only after at least one completed cycle; **Extra safe** removes them. A positive LH makes that day and the next three Careful. Temperature, cervical mucus, BBT units, the disturbed flag, and a Chart/Rhythm nav tab are gone.

## Misc verification
- Clipboard: `pbpaste` after "Copy code" returns the invite code. On the post-creation invite screen, Copy/Share must be non-submit buttons and keep the user on that screen; "Go to my day" and "I'll do this later" must both land on Today.
- Victory card: after a fresh tracker, log a medium period around today−3, then log a medium period 31 days ago through Calendar → day sheet → "Log this day". The completed cycle makes the current day 4 a Yes day and shows `VICTORY #1` within the first five days.
- "Export as JSON" downloads to `~/Downloads/greenlight-*.json`; parse it to confirm settings/logs/notes.
- Sanitizers: `POST /api/couples` returns an intended bearer token for a test member. Use it to `PUT /api/logs`, `POST /api/logs/bulk`, and `PUT /api/settings` with injected `temperature`, `temperatureUnit`, `disturbed`, `mucus`, or `trackMucus`; the returned state should contain only current fields.
- CORS: `curl -D- http://localhost:3001/api/health -H "Origin: <url>"` — non-`localhost:5173` origins get no `Access-Control-Allow-Origin` header (requests aren't blocked server-side; browsers can't read the response, and non-simple requests fail preflight).
- Editing a day via Calendar "Edit log"/"Log this day" lands on the Log screen for that date; future dates have no editable log.
