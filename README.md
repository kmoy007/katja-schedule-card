# Katja Schedule Card

Custom Lovelace card for the [Katja Schedule](https://github.com/kmoy007/katja-schedule-ha) Home Assistant integration.

Optimized for a 4K portrait wall display — shows a 2-week scrollable schedule with today/tomorrow visually dominant, color-coded by family member, flight badges, and drive time styling. Dark theme. Schedule/Calendar view toggle.

## Installation

1. In HACS: Settings → Custom Repositories
2. Paste: `kmoy007/katja-schedule-card` → Category: **Dashboard**
3. Install → Restart HA

Or manually: copy `katja-schedule-card.js` to `config/www/` and add as a resource in Lovelace.

## Configuration

```yaml
type: custom:katja-schedule-card
title: Family Schedule
calendars:
  - entity: calendar.katja_schedule_alice
    color: '#FF6B6B'
    label: Alice
  - entity: calendar.katja_schedule_bob
    color: '#4ECDC4'
    label: Bob
  - entity: calendar.katja_schedule_shared
    color: '#FFEAA7'
    label: Shared
sensors:
  pending: sensor.katja_schedule_pending_review
  sync: sensor.katja_schedule_last_sync
```

Calendar entity names match the family members configured in the integration.

`color` is optional. Events are coloured by person using the card's built-in person palette (the same colours as the web app): the first word of `Who`, so "Sam & Katja" is Sam, as named by the integration's `Person:` line (0.31.0+); a known person always wins. `color` only colours events from that calendar that have no known person.

### Single-view mode

Lock a card to one view for flexible dashboard layouts:

```yaml
# Today's events only
type: custom:katja-schedule-card
view: today
calendars: ...

# Tomorrow's events only
type: custom:katja-schedule-card
view: tomorrow
calendars: ...

# 4-week calendar grid only
type: custom:katja-schedule-card
view: calendar
calendars: ...
```

Options: `today`, `tomorrow`, `calendar`, `schedule`, `overview`, `dayview`, `dayview-today`, `starred`, `preview` (default: full card with toggle).
Locked views hide the header and view toggle for a clean embedded look.

### Preview (a small panel)

`view: preview` is a compact list for a small wall tablet (built for the 600 px portrait Bathroom and Master Bedroom panels):

```yaml
type: custom:katja-schedule-card
view: preview
theme: none
show_theme_toggle: false
rows: 6                 # rows the card shows, all-day ones included (default 6)
row_height: 42          # px per row (default 42, at least 24)
evening_switch: '21:00' # Pacific; when it may switch to tomorrow (default '21:00'). Quote it: YAML reads 21:00 as a number
calendars:
  - entity: calendar.schedule
tap_action:             # optional; any Home Assistant action
  action: fire-dom-event
  browser_mod:
    service: browser_mod.popup
    data: {title: Family Schedule, size: fullscreen, content: {...}}
```

- One small header line, `TODAY · FRI 2 OCT`, with `+ tomorrow ›` on the right when there is a `tap_action`. No title, view toggle, theme toggle, review or sync chips.
- All-day events are pinned at the top. Below them each timed event is one line: start time, the person's colour dot, the title (drives italic and muted).
- The card shows `rows` rows in all, the pinned all-day ones included, so its height doesn't change with the number of all-day events. The timed rows fill what's left and scroll by touch (no scrollbar). If there are too many all-day events, the first ones are pinned, leaving the timed list at least one visible row, and the rest are at the top of the scrolling list, a scroll up.
- Events that have ended are greyed. When the card draws, the list is scrolled so the first event that hasn't ended is at the top; the ended ones are a scroll up.
- Someone using it isn't interrupted: for 90 s after a touch or a mouse wheel on the card (the same 90 s the panels wait before going back to their home screen), a redraw (the minute tick, the 5-minute refresh) leaves the list where it is. After that, the next redraw scrolls it past the ended events again. When Home Assistant brings the card back after a dashboard view switch, the list is scrolled past the ended events again.
- When rows are below the visible ones, an amber `⌄ N more` button sits under the list. A tap scrolls three rows down. It counts down as you scroll and hides at the bottom (its space stays, so the dashboard doesn't jump).
- From `evening_switch` on, once no timed event today is still running, it shows **tomorrow**: an amber bar with a big **Tomorrow** and the date, and tomorrow's events (or "Nothing on the calendar tomorrow"). This is checked every minute.
- A tap on the header or a row (not on `N more`, and not a scroll) runs `tap_action` through Home Assistant, so the dashboard can open a popup with the full day. With no `tap_action`, a row opens that event's details and the header does nothing; `tap_action: {action: none}` makes every tap do nothing.
- It has its own dark palette (card `#1d2a2f`, amber `#ffd38a`) whatever the `theme`: it is made to sit on a dark dashboard, and the amber is only readable on dark. The font follows the theme.
- If no calendar loaded (the calendar API failed, or the entity is unavailable), the first row is a muted "⚠ Couldn't load the calendar" instead of "Nothing on the calendar today", so a broken calendar never looks like a quiet day. Whatever did come back is shown under it. If some calendars loaded, it shows what loaded. Before the first load it says "Loading the calendar…".
- A bad `rows`, `row_height` or `evening_switch` is shown as a configuration error on the card.

## Features

- Schedule/Calendar view toggle
- Today and tomorrow visually prominent
- Color dot per family member
- Drive rows styled italic/muted
- Flight events get a teal badge with flight number
- Pending review count badge in header
- An assistant's change waiting for review says where it came from, beside its Apply and in the review list: who forwarded the email, the flight, where the assistant was asked, or a warning for mail a stranger sent to the inbox. The words are the app's own, the same the web and the iPhone app show; a server too old to send them leaves the line out. A stranger's mail is applied one at a time, never by an Apply all
- Last sync time in header
- Weekend day headers tinted warm
- Sticky day headers while scrolling
- Mon–Sun week grid in calendar view; tap a day for that day's full view, tap an event there for its details
- Auto-refreshes every 5 minutes
- A hide, accept, star or rule made on the card shows straight away. Update the integration to 0.31.1 or later with the card: an older integration answers before it has re-read the schedule, so the row comes back until its next poll

# sync test
