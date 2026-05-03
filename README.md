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

## Features

- Schedule/Calendar view toggle
- Today and tomorrow visually prominent
- Color dot per family member
- Drive rows styled italic/muted
- Flight events get a teal badge with flight number
- Pending review count badge in header
- Last sync time in header
- Weekend day headers tinted warm
- Sticky day headers while scrolling
- Mon–Sun week grid in calendar view
- Auto-refreshes every 5 minutes
