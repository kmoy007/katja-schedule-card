# Katja Schedule Card

Custom Lovelace card for the [Katja Schedule](https://github.com/kmoy007/katja-schedule-ha) Home Assistant integration.

Optimized for a 4K portrait wall display — shows a 14-day scrollable schedule with today/tomorrow visually dominant, color-coded by family member, flight badges, and drive time styling. Dark theme.

## Installation

1. In HACS: Settings → Custom Repositories
2. Paste: `kmoy007/katja-schedule-card` → Category: **Dashboard**
3. Install → Restart HA

Or manually: copy `dist/katja-schedule-card.js` to `config/www/` and add as a resource in Lovelace.

## Configuration

```yaml
type: custom:katja-schedule-card
title: Family Schedule
days: 14
calendars:
  - entity: calendar.katja_schedule_katja
    color: '#FF6B6B'
    label: Katja
  - entity: calendar.katja_schedule_ken
    color: '#4ECDC4'
    label: Ken
  - entity: calendar.katja_schedule_caleb
    color: '#45B7D1'
    label: Caleb
  - entity: calendar.katja_schedule_sam
    color: '#96CEB4'
    label: Sam
  - entity: calendar.katja_schedule_shared
    color: '#FFEAA7'
    label: Shared
sensors:
  pending: sensor.katja_schedule_pending_review
  sync: sensor.katja_schedule_last_sync
```

## Features

- Today and tomorrow sections are visually prominent
- Color dot per family member
- Drive rows styled italic/muted
- Flight events get a teal badge with flight number
- Pending review count badge in header
- Last sync time in header
- Weekend day headers tinted warm
- Sticky day headers while scrolling
- Auto-refreshes every 5 minutes
