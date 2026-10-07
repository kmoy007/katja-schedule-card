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
- **The preview is the other exception** — with a `tap_action` configured, a tap on any row (or the header) runs that action through HA's `hass-action` event; the panels open a popup with the full day, where each event is tappable. Without one, a row opens its sheet.
- **Recheck calls go through HA WebSocket** (`katja_schedule/refresh_drive`, `katja_schedule/refresh_flight`, `katja_schedule/agent_action`) — never call the Flask API directly from the card.
- **Show traffic warnings** — if `has_traffic` is false, show a red warning. Always show departure time and checked-at timestamp.
- **Words read at 4.5:1 in every theme (card 0.90.0).** A theme's `muted` (and its own `eventTextSoft`) reads on the card, today, a Day View block, a month day (a weekend's and today's tint included), the sheet, the month's day popup (today's tint and the blocks over the sheet), and the light tints on them; give a new theme its colours as theme values (`todayBg`, `calDayBg`, …), never a `background` in its `customCss`. Words in a fixed hue (a review item's tag, a row's REVIEW tag, the "→ end" chip, the Hide flow, the review queue's Accept and Hide, the error and drive lines) are `var(--label-<name>)`: add one to `LABELS` with its hue, fill and place, and the card makes it read on each theme (`readableOn`). Words in the accent are `var(--accent-ink)`, and grey words on a strong tint (a waiting chip or block, a Hide option, the Hide form's empty preview) are `var(--muted-on-tint)`. `tests/test_ha_card_theme_contrast.py` runs the card's own `_themeVars` for every theme and measures all of it, and every other rule that writes words in a colour, at its opacity; what still reads below 4.5:1 is its `STILL_LOW` (the ★ symbols and the Starred layouts' amber headings) or `FAINT_ON_PURPOSE` (chrome that steps back), which only shrink, and a colour no theme defines fails unless it is one the markup sets on each element (`PER_ELEMENT`). A theme name in the YAML is matched without regard to case (`_themeKey`). The Starred layouts and the `none` theme (Home Assistant's own colours) are not measured as drawn.
- **Going away is struck through, never faded.** A row deleted upstream and a row with a removal waiting keep their words at full strength, struck through in the list, the Day View and the month; only the states Ken keeps faint (hidden, later days of a multi-day event, drive rows, past and outside days) fade, and `EVENT_FADES` in `tests/test_web_person_contrast.py` names each (the card's are not measured as drawn).

## Views

- **Overview** (default): today + tomorrow side by side, 4-week calendar grid below
- **Schedule** (Cards): scrollable day cards, past days hidden
- **Calendar**: 4-week grid starting from today, tap anywhere in a day → day detail modal (the Day View layout for that day)
- **Preview** (`view: preview`, locked only): the compact today list for the small portrait wall panels, tomorrow after `evening_switch` once nothing timed is left today. Behaviour and settings: `README.md` → "Preview (a small panel)". For code changes: its own dark palette (`.pv-host` tokens) whatever the theme; `_previewLayout` decides what is pinned and what scrolls; every render scrolls the list past the ended events except during the 90 s hold after a touch (`_previewHeld`), so the minute ticker can re-render it freely; `_fetchEvents` sets `_fetchFailed` when no calendar loaded. Tests: `tests/test_ha_card_preview.py` (the rules, run in Node) and `tests/e2e/test_ha_card_preview.py` (scroll, button, taps, other views untouched)

## Versioning

- **Bump `CARD_VERSION`** in the JS on every change.
- **Create a GitHub release with a version tag** so HACS detects updates.
- The header shows both card version and app build info: `v0.13.0 · app abc1234 · May 4`

## Structure

- Single file: `katja-schedule-card.js` — no build system, plain JS with Shadow DOM.
- `hacs.json` — HACS metadata, `filename` must match the JS file name.
- Installed via HACS custom repository or manual copy to `config/www/`.
