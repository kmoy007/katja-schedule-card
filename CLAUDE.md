# CLAUDE.md — Agent Rules for Katja Schedule HA Card

This is the custom Lovelace card for the Katja Schedule HA integration.
It must stay aligned with the main web app at `kmoy007/katja-schedule`.

## Alignment Rule

- **This card must match the web app's UI capabilities.** When the web app adds views, event interactions, drive/flight features, or layout changes, implement them here in the same session.
- Check the main app's `CLAUDE.md` and `project_architecture.md` (in the Claude memory) for the full architecture.

## Key Conventions

- **All dates use `_pacificNow()`** — never raw `new Date()`. The schedule is always Pacific time.
- **Deduplicate events** — multi-person events appear in multiple calendar entities. Dedupe by `summary + start time`.
- **Event detail modal** — tap any event to see details. Drive events get "Recheck Drive Time", flight events get "Recheck Flight".
- **The month grid is the exception** — a tap anywhere in a day (date, chip, multi-day bar or empty space) opens that day's popup; the chips are too small to hit on the wall panels. Each event is tappable in the popup. One `.cal-day-hit` button per day column lies over the week; do not put `data-event-idx` on anything in the grid.
- **Recheck calls go through HA WebSocket** (`katja_schedule/refresh_drive`, `katja_schedule/refresh_flight`, `katja_schedule/agent_action`) — never call the Flask API directly from the card.
- **Show traffic warnings** — if `has_traffic` is false, show a red warning. Always show departure time and checked-at timestamp.

## Views

- **Overview** (default): today + tomorrow side by side, 4-week calendar grid below
- **Schedule** (Cards): scrollable day cards, past days hidden
- **Calendar**: 4-week grid starting from today, tap anywhere in a day → day detail modal (the Day View layout for that day)

## Versioning

- **Bump `CARD_VERSION`** in the JS on every change.
- **Create a GitHub release with a version tag** so HACS detects updates.
- The header shows both card version and app build info: `v0.13.0 · app abc1234 · May 4`

## Structure

- Single file: `katja-schedule-card.js` — no build system, plain JS with Shadow DOM.
- `hacs.json` — HACS metadata, `filename` must match the JS file name.
- Installed via HACS custom repository or manual copy to `config/www/`.
