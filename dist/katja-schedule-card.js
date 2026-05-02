/**
 * Katja Schedule Card — custom Lovelace card for the Katja Schedule integration.
 *
 * Shows a 14-day scrollable schedule with today/tomorrow dominant.
 * Dark theme, color-coded by family member, flight/drive badges.
 *
 * Configuration:
 *   type: custom:katja-schedule-card
 *   calendars:
 *     - entity: calendar.katja_schedule_katja
 *       color: '#FF6B6B'
 *       label: Katja
 *     - entity: calendar.katja_schedule_ken
 *       color: '#4ECDC4'
 *       label: Ken
 *     ...
 *   days: 14
 *   title: "Family Schedule"
 */

const CARD_VERSION = "0.1.0";

const PERSON_COLORS = {
  katja: "#FF6B6B",
  ken: "#4ECDC4",
  caleb: "#45B7D1",
  sam: "#96CEB4",
  shared: "#FFEAA7",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

class KatjaScheduleCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._events = [];
    this._lastFetch = 0;
    this._fetchInterval = 5 * 60 * 1000; // 5 min
  }

  set hass(hass) {
    this._hass = hass;
    const now = Date.now();
    if (now - this._lastFetch > this._fetchInterval) {
      this._fetchEvents();
    }
  }

  setConfig(config) {
    if (!config.calendars || !config.calendars.length) {
      throw new Error("Please define at least one calendar entity.");
    }
    this._config = {
      days: 14,
      title: "Family Schedule",
      ...config,
    };
    this._render();
  }

  getCardSize() {
    return 12;
  }

  static getConfigElement() {
    return document.createElement("katja-schedule-card-editor");
  }

  async _fetchEvents() {
    if (!this._hass || !this._config.calendars) return;
    this._lastFetch = Date.now();

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + (this._config.days || 14));

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const allEvents = [];

    for (const cal of this._config.calendars) {
      try {
        const events = await this._hass.callApi(
          "GET",
          `calendars/${cal.entity}?start=${startISO}&end=${endISO}`
        );
        for (const ev of events || []) {
          allEvents.push({
            ...ev,
            _color: cal.color || PERSON_COLORS[cal.label?.toLowerCase()] || "#888",
            _label: cal.label || cal.entity.split("_").pop(),
          });
        }
      } catch (e) {
        console.warn(`Failed to fetch events from ${cal.entity}:`, e);
      }
    }

    this._events = allEvents;
    this._render();
  }

  _groupByDate(events) {
    const groups = {};
    for (const ev of events) {
      const dateStr = (ev.start?.dateTime || ev.start?.date || "").slice(0, 10);
      if (!dateStr) continue;
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(ev);
    }
    // Sort events within each day by start time
    for (const d of Object.keys(groups)) {
      groups[d].sort((a, b) => {
        const aTime = a.start?.dateTime || a.start?.date || "";
        const bTime = b.start?.dateTime || b.start?.date || "";
        return aTime.localeCompare(bTime);
      });
    }
    return groups;
  }

  _formatTime(ev) {
    const dt = ev.start?.dateTime;
    if (!dt) return "All day";
    const d = new Date(dt);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const mStr = m < 10 ? `0${m}` : m;

    const endDt = ev.end?.dateTime;
    if (endDt) {
      const ed = new Date(endDt);
      let eh = ed.getHours();
      const em = ed.getMinutes();
      const eampm = eh >= 12 ? "PM" : "AM";
      if (eh > 12) eh -= 12;
      if (eh === 0) eh = 12;
      const emStr = em < 10 ? `0${em}` : em;
      if (ampm === eampm) {
        return `${h}:${mStr}–${eh}:${emStr} ${eampm}`;
      }
      return `${h}:${mStr} ${ampm}–${eh}:${emStr} ${eampm}`;
    }
    return `${h}:${mStr} ${ampm}`;
  }

  _isToday(dateStr) {
    const today = new Date();
    return dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  _isTomorrow(dateStr) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateStr === `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  }

  _formatDateHeader(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    const day = DAY_NAMES[d.getDay()];
    const month = MONTH_NAMES[d.getMonth()];
    const date = d.getDate();
    if (this._isToday(dateStr)) return `Today — ${day}, ${month} ${date}`;
    if (this._isTomorrow(dateStr)) return `Tomorrow — ${day}, ${month} ${date}`;
    return `${day}, ${month} ${date}`;
  }

  _isDrive(summary) {
    return summary && summary.toLowerCase().includes("drive");
  }

  _isFlight(summary) {
    return summary && (summary.includes("✈") || summary.toLowerCase().includes("flight") || summary.toLowerCase().includes("lands"));
  }

  _render() {
    if (!this.shadowRoot) return;

    const grouped = this._groupByDate(this._events);
    const now = new Date();
    const days = [];
    for (let i = 0; i < (this._config.days || 14); i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push(ds);
    }

    // Pending review sensor
    let pendingCount = 0;
    if (this._hass && this._config.sensors?.pending) {
      const state = this._hass.states[this._config.sensors.pending];
      if (state) pendingCount = parseInt(state.state) || 0;
    }

    // Last sync sensor
    let syncText = "";
    if (this._hass && this._config.sensors?.sync) {
      const state = this._hass.states[this._config.sensors.sync];
      if (state && state.state) {
        const syncDate = new Date(state.state);
        const mins = Math.round((Date.now() - syncDate.getTime()) / 60000);
        syncText = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
      }
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          color: #e0e0e0;
          --card-bg: var(--ha-card-background, #1e1e2e);
          --day-bg: rgba(255,255,255,0.04);
          --today-bg: rgba(255,255,255,0.08);
          --border: rgba(255,255,255,0.08);
          --muted: #8a8a9a;
        }
        .card {
          background: var(--card-bg);
          border-radius: 16px;
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
        }
        .header .title {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
        }
        .header .meta {
          display: flex;
          gap: 16px;
          align-items: center;
          font-size: 12px;
          color: var(--muted);
        }
        .header .badge {
          background: #E0A020;
          color: #1e1e2e;
          font-weight: 700;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 12px;
        }
        .days {
          padding: 8px 0;
        }
        .day {
          padding: 0 20px;
          margin-bottom: 4px;
        }
        .day-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 4px 8px;
          font-weight: 600;
          font-size: 14px;
          color: var(--muted);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          background: var(--card-bg);
          z-index: 2;
        }
        .day.is-today .day-header {
          color: #fff;
          font-size: 18px;
          border-bottom-color: rgba(255,255,255,0.15);
        }
        .day.is-tomorrow .day-header {
          color: #ccc;
          font-size: 16px;
        }
        .day.is-today {
          background: var(--today-bg);
          border-radius: 12px;
          padding-top: 4px;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .day-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--muted);
          flex-shrink: 0;
        }
        .day.is-today .day-dot { background: #4ECDC4; width: 10px; height: 10px; }
        .day.is-tomorrow .day-dot { background: #45B7D1; }
        .event-count {
          font-size: 11px;
          color: var(--muted);
          font-weight: 400;
        }
        .events {
          padding: 4px 0;
        }
        .event {
          display: grid;
          grid-template-columns: 90px 1fr;
          gap: 12px;
          padding: 8px 4px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          align-items: start;
        }
        .day.is-today .event {
          padding: 10px 4px;
          grid-template-columns: 100px 1fr;
        }
        .event:last-child { border-bottom: none; }
        .event-time {
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          color: var(--muted);
          text-align: right;
          padding-top: 1px;
        }
        .day.is-today .event-time {
          font-size: 15px;
          color: #bbb;
        }
        .event-body {
          min-width: 0;
        }
        .event-summary {
          font-size: 14px;
          font-weight: 500;
          color: #e0e0e0;
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 1.3;
        }
        .day.is-today .event-summary {
          font-size: 16px;
          color: #fff;
        }
        .event-summary .person-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .event-location {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
          line-height: 1.3;
        }
        .day.is-today .event-location { font-size: 13px; }
        .event.is-drive .event-summary {
          font-style: italic;
          color: var(--muted);
          font-weight: 400;
        }
        .event.is-drive .event-time { color: rgba(255,255,255,0.25); }
        .flight-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(78, 205, 196, 0.15);
          color: #4ECDC4;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 8px;
        }
        .no-events {
          padding: 8px 4px;
          font-size: 13px;
          color: rgba(255,255,255,0.2);
          font-style: italic;
        }
        .weekend .day-header { color: rgba(255,180,120,0.7); }
        .weekend.is-today .day-header { color: #FFB478; }
      </style>

      <ha-card>
        <div class="card">
          <div class="header">
            <span class="title">${this._config.title || "Family Schedule"}</span>
            <div class="meta">
              ${pendingCount > 0 ? `<span class="badge">${pendingCount} pending</span>` : ""}
              ${syncText ? `<span>Synced ${syncText}</span>` : ""}
            </div>
          </div>
          <div class="days">
            ${days.map(ds => this._renderDay(ds, grouped[ds] || [])).join("")}
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderDay(dateStr, events) {
    const isToday = this._isToday(dateStr);
    const isTomorrow = this._isTomorrow(dateStr);
    const d = new Date(dateStr + "T12:00:00");
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    let cls = "day";
    if (isToday) cls += " is-today";
    if (isTomorrow) cls += " is-tomorrow";
    if (isWeekend) cls += " weekend";

    const header = this._formatDateHeader(dateStr);
    const count = events.length;

    return `
      <div class="${cls}">
        <div class="day-header">
          <span class="day-dot"></span>
          ${header}
          ${count > 0 && !isToday ? `<span class="event-count">${count} event${count !== 1 ? "s" : ""}</span>` : ""}
        </div>
        <div class="events">
          ${count === 0
            ? `<div class="no-events">No events</div>`
            : events.map(ev => this._renderEvent(ev, isToday)).join("")
          }
        </div>
      </div>
    `;
  }

  _renderEvent(ev, isToday) {
    const summary = ev.summary || "";
    const isDrive = this._isDrive(summary);
    const isFlight = this._isFlight(summary);
    const location = ev.location || "";
    const description = ev.description || "";
    const time = this._formatTime(ev);
    const color = ev._color || "#888";

    let flightBadge = "";
    if (isFlight && description) {
      const flightMatch = description.match(/Flight:\s*(\S+)/);
      if (flightMatch) {
        flightBadge = `<span class="flight-badge">✈ ${flightMatch[1]}</span>`;
      }
    }

    let cls = "event";
    if (isDrive) cls += " is-drive";

    return `
      <div class="${cls}">
        <div class="event-time">${time}</div>
        <div class="event-body">
          <div class="event-summary">
            <span class="person-dot" style="background: ${color}"></span>
            ${summary}
            ${flightBadge}
          </div>
          ${location ? `<div class="event-location">${location}</div>` : ""}
        </div>
      </div>
    `;
  }
}

customElements.define("katja-schedule-card", KatjaScheduleCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "katja-schedule-card",
  name: "Katja Schedule",
  description: "14-day family schedule with color-coded events, flight badges, and drive time styling.",
  preview: false,
});

console.info(`%c KATJA-SCHEDULE-CARD %c v${CARD_VERSION} `, "background: #4ECDC4; color: #1e1e2e; font-weight: bold;", "background: #1e1e2e; color: #4ECDC4;");
