/**
 * Katja Schedule Card — custom Lovelace card for the Katja Schedule integration.
 *
 * Two views, toggled in the header:
 *   - Schedule: scrollable agenda with today/tomorrow dominant
 *   - Calendar: 2-week grid, days as columns, events as colored blocks
 *
 * Dark theme, color-coded by family member, flight/drive badges.
 */

const CARD_VERSION = "0.4.0";

const PERSON_COLORS = {
  katja: "#FF6B6B",
  ken: "#4ECDC4",
  caleb: "#45B7D1",
  sam: "#96CEB4",
  shared: "#FFEAA7",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

class KatjaScheduleCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._events = [];
    this._lastFetch = 0;
    this._fetchInterval = 5 * 60 * 1000;
    this._view = "schedule"; // "schedule" or "calendar"
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
    this._config = { days: 14, title: "Family Schedule", ...config };
    this._render();
  }

  getCardSize() { return 12; }

  async _fetchEvents() {
    if (!this._hass || !this._config.calendars) return;
    this._lastFetch = Date.now();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + (this._config.days || 14));
    const allEvents = [];
    for (const cal of this._config.calendars) {
      try {
        const events = await this._hass.callApi(
          "GET", `calendars/${cal.entity}?start=${start.toISOString()}&end=${end.toISOString()}`
        );
        for (const ev of events || []) {
          allEvents.push({
            ...ev,
            _color: cal.color || PERSON_COLORS[cal.label?.toLowerCase()] || "#888",
            _label: cal.label || cal.entity.split("_").pop(),
          });
        }
      } catch (e) {
        console.warn(`Failed to fetch from ${cal.entity}:`, e);
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
    for (const d of Object.keys(groups)) {
      groups[d].sort((a, b) =>
        (a.start?.dateTime || a.start?.date || "").localeCompare(b.start?.dateTime || b.start?.date || "")
      );
    }
    return groups;
  }

  _formatTime(ev) {
    const dt = ev.start?.dateTime;
    if (!dt) return "All day";
    const d = new Date(dt);
    let h = d.getHours(), m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12; if (h === 0) h = 12;
    const mStr = m < 10 ? `0${m}` : m;
    const endDt = ev.end?.dateTime;
    if (endDt) {
      const ed = new Date(endDt);
      let eh = ed.getHours(); const em = ed.getMinutes();
      const eampm = eh >= 12 ? "PM" : "AM";
      if (eh > 12) eh -= 12; if (eh === 0) eh = 12;
      const emStr = em < 10 ? `0${em}` : em;
      return ampm === eampm
        ? `${h}:${mStr}–${eh}:${emStr} ${eampm}`
        : `${h}:${mStr} ${ampm}–${eh}:${emStr} ${eampm}`;
    }
    return `${h}:${mStr} ${ampm}`;
  }

  _formatTimeShort(ev) {
    const dt = ev.start?.dateTime;
    if (!dt) return "";
    const d = new Date(dt);
    let h = d.getHours(), m = d.getMinutes();
    const ampm = h >= 12 ? "p" : "a";
    if (h > 12) h -= 12; if (h === 0) h = 12;
    return m === 0 ? `${h}${ampm}` : `${h}:${m < 10 ? "0" + m : m}${ampm}`;
  }

  _todayStr() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
  }
  _isToday(ds) { return ds === this._todayStr(); }
  _isTomorrow(ds) {
    const t = new Date(); t.setDate(t.getDate()+1);
    return ds === `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
  }

  _formatDateHeader(ds) {
    const d = new Date(ds + "T12:00:00");
    const day = DAY_NAMES[d.getDay()], month = MONTH_NAMES[d.getMonth()], date = d.getDate();
    if (this._isToday(ds)) return `Today — ${day}, ${month} ${date}`;
    if (this._isTomorrow(ds)) return `Tomorrow — ${day}, ${month} ${date}`;
    return `${day}, ${month} ${date}`;
  }

  _isDrive(s) { return s && s.toLowerCase().includes("drive"); }
  _isFlight(s) { return s && (s.includes("✈") || s.toLowerCase().includes("flight") || s.toLowerCase().includes("lands")); }

  _getDays() {
    const now = new Date(), days = [];
    for (let i = 0; i < (this._config.days || 14); i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
    }
    return days;
  }

  _getSensorData() {
    let pendingCount = 0, syncText = "";
    if (this._hass && this._config.sensors?.pending) {
      const s = this._hass.states[this._config.sensors.pending];
      if (s) pendingCount = parseInt(s.state) || 0;
    }
    if (this._hass && this._config.sensors?.sync) {
      const s = this._hass.states[this._config.sensors.sync];
      if (s?.state) {
        const mins = Math.round((Date.now() - new Date(s.state).getTime()) / 60000);
        syncText = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.round(mins/60)}h ago`;
      }
    }
    return { pendingCount, syncText };
  }

  _switchView(view) {
    this._view = view;
    this._render();
  }

  _render() {
    if (!this.shadowRoot) return;
    const grouped = this._groupByDate(this._events);
    const days = this._getDays();
    const { pendingCount, syncText } = this._getSensorData();

    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <ha-card>
        <div class="card">
          <div class="header">
            <span class="title">${this._config.title || "Family Schedule"}</span>
            <div class="view-toggle">
              <button class="toggle-btn ${this._view === "schedule" ? "active" : ""}" data-view="schedule">Schedule</button>
              <button class="toggle-btn ${this._view === "calendar" ? "active" : ""}" data-view="calendar">Calendar</button>
            </div>
            <div class="meta">
              ${pendingCount > 0 ? `<span class="badge">${pendingCount} pending</span>` : ""}
              ${syncText ? `<span>Synced ${syncText}</span>` : ""}
              <span class="version">v${CARD_VERSION}</span>
            </div>
          </div>
          ${this._view === "schedule"
            ? `<div class="days">${days.map(ds => this._renderDay(ds, grouped[ds] || [])).join("")}</div>`
            : this._renderCalendarGrid(days, grouped)
          }
        </div>
      </ha-card>
    `;

    // Bind toggle buttons
    this.shadowRoot.querySelectorAll(".toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => this._switchView(btn.dataset.view));
    });
  }

  // ====================== SCHEDULE VIEW ======================

  _renderDay(ds, events) {
    const isToday = this._isToday(ds), isTomorrow = this._isTomorrow(ds);
    const d = new Date(ds + "T12:00:00");
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    let cls = "day";
    if (isToday) cls += " is-today";
    if (isTomorrow) cls += " is-tomorrow";
    if (isWeekend) cls += " weekend";
    const count = events.length;
    return `
      <div class="${cls}">
        <div class="day-header">
          <span class="day-dot"></span>
          ${this._formatDateHeader(ds)}
          ${count > 0 && !isToday ? `<span class="event-count">${count} event${count!==1?"s":""}</span>` : ""}
        </div>
        <div class="events">
          ${count === 0
            ? `<div class="no-events">No events</div>`
            : events.map(ev => this._renderEvent(ev)).join("")}
        </div>
      </div>`;
  }

  _renderEvent(ev) {
    const summary = ev.summary || "", isDrive = this._isDrive(summary), isFlight = this._isFlight(summary);
    const location = ev.location || "", description = ev.description || "";
    let flightBadge = "";
    if (isFlight && description) {
      const m = description.match(/Flight:\s*(\S+)/);
      if (m) flightBadge = `<span class="flight-badge">✈ ${m[1]}</span>`;
    }
    return `
      <div class="event${isDrive ? " is-drive" : ""}">
        <div class="event-time">${this._formatTime(ev)}</div>
        <div class="event-body">
          <div class="event-summary">
            <span class="person-dot" style="background:${ev._color||"#888"}"></span>
            ${summary} ${flightBadge}
          </div>
          ${location ? `<div class="event-location">${location}</div>` : ""}
        </div>
      </div>`;
  }

  // ====================== CALENDAR GRID VIEW ======================

  _renderCalendarGrid(days, grouped) {
    const weeks = [];
    const firstDate = new Date(days[0] + "T12:00:00");
    // Monday = 0 offset. JS getDay(): Mon=1..Sun=0. Convert so Mon=0.
    const jsDay = firstDate.getDay();
    const padBefore = jsDay === 0 ? 6 : jsDay - 1; // days to pad back to Monday
    const _fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

    const allDays = [];
    for (let i = padBefore; i > 0; i--) {
      const d = new Date(firstDate); d.setDate(d.getDate() - i);
      allDays.push({ ds: _fmt(d), outside: true });
    }
    for (const ds of days) {
      allDays.push({ ds, outside: false });
    }
    while (allDays.length % 7 !== 0) {
      const last = new Date(allDays[allDays.length-1].ds + "T12:00:00");
      last.setDate(last.getDate() + 1);
      allDays.push({ ds: _fmt(last), outside: true });
    }
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }

    return `
      <div class="cal-grid">
        <div class="cal-header-row">
          ${DAY_SHORT_MON.map(d => `<div class="cal-header-cell">${d}</div>`).join("")}
        </div>
        ${weeks.map(week => `
          <div class="cal-week">
            ${week.map(({ ds, outside }) => {
              const isToday = this._isToday(ds);
              const d = new Date(ds + "T12:00:00");
              const evts = grouped[ds] || [];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              let cls = "cal-day";
              if (isToday) cls += " cal-today";
              if (outside) cls += " cal-outside";
              if (isWeekend) cls += " cal-weekend";
              return `
                <div class="${cls}">
                  <div class="cal-date">${d.getDate()}</div>
                  <div class="cal-events">
                    ${evts.map(ev => {
                      const isDrive = this._isDrive(ev.summary || "");
                      return `<div class="cal-event${isDrive ? " cal-drive" : ""}" style="border-left: 3px solid ${ev._color || "#888"}">
                        <span class="cal-event-time">${this._formatTimeShort(ev)}</span>
                        <span class="cal-event-text">${ev.summary || ""}</span>
                      </div>`;
                    }).join("")}
                  </div>
                </div>`;
            }).join("")}
          </div>
        `).join("")}
      </div>`;
  }

  // ====================== STYLES ======================

  _getStyles() {
    return `
      :host {
        display: block;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        color: #e0e0e0;
        --card-bg: var(--ha-card-background, #1e1e2e);
        --today-bg: rgba(255,255,255,0.08);
        --border: rgba(255,255,255,0.08);
        --muted: #8a8a9a;
      }
      .card { background: var(--card-bg); border-radius: 16px; overflow: hidden; }

      /* --- Header + Toggle --- */
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
        flex-wrap: wrap; gap: 12px;
      }
      .header .title { font-size: 22px; font-weight: 700; color: #fff; }
      .header .meta { display: flex; gap: 16px; align-items: center; font-size: 12px; color: var(--muted); }
      .header .badge { background: #E0A020; color: #1e1e2e; font-weight: 700; font-size: 11px; padding: 3px 10px; border-radius: 12px; }
      .header .version { font-size: 10px; color: rgba(255,255,255,0.2); }
      .view-toggle {
        display: flex; background: rgba(255,255,255,0.06); border-radius: 20px; padding: 3px;
      }
      .toggle-btn {
        background: transparent; border: none; color: var(--muted); cursor: pointer;
        padding: 6px 16px; border-radius: 16px; font-size: 12px; font-weight: 600;
        transition: all 0.15s;
      }
      .toggle-btn.active { background: rgba(255,255,255,0.12); color: #fff; }
      .toggle-btn:hover:not(.active) { color: #ccc; }

      /* --- Schedule view --- */
      .days { padding: 8px 0; }
      .day { padding: 0 20px; margin-bottom: 4px; }
      .day-header {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 4px 8px; font-weight: 600; font-size: 14px;
        color: var(--muted); border-bottom: 1px solid var(--border);
        position: sticky; top: 0; background: var(--card-bg); z-index: 2;
      }
      .day.is-today .day-header { color: #fff; font-size: 18px; border-bottom-color: rgba(255,255,255,0.15); }
      .day.is-tomorrow .day-header { color: #ccc; font-size: 16px; }
      .day.is-today { background: var(--today-bg); border-radius: 12px; padding-top: 4px; padding-bottom: 8px; margin-bottom: 8px; }
      .day-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
      .day.is-today .day-dot { background: #4ECDC4; width: 10px; height: 10px; }
      .day.is-tomorrow .day-dot { background: #45B7D1; }
      .event-count { font-size: 11px; color: var(--muted); font-weight: 400; }
      .events { padding: 4px 0; }
      .event {
        display: grid; grid-template-columns: 90px 1fr; gap: 12px;
        padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.03); align-items: start;
      }
      .day.is-today .event { padding: 10px 4px; grid-template-columns: 100px 1fr; }
      .event:last-child { border-bottom: none; }
      .event-time { font-size: 13px; font-variant-numeric: tabular-nums; color: var(--muted); text-align: right; padding-top: 1px; }
      .day.is-today .event-time { font-size: 15px; color: #bbb; }
      .event-body { min-width: 0; }
      .event-summary { font-size: 14px; font-weight: 500; color: #e0e0e0; display: flex; align-items: center; gap: 8px; line-height: 1.3; }
      .day.is-today .event-summary { font-size: 16px; color: #fff; }
      .event-summary .person-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .event-location { font-size: 12px; color: var(--muted); margin-top: 2px; line-height: 1.3; }
      .day.is-today .event-location { font-size: 13px; }
      .event.is-drive .event-summary { font-style: italic; color: var(--muted); font-weight: 400; }
      .event.is-drive .event-time { color: rgba(255,255,255,0.25); }
      .flight-badge {
        display: inline-flex; align-items: center; gap: 4px;
        background: rgba(78,205,196,0.15); color: #4ECDC4;
        font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 8px;
      }
      .no-events { padding: 8px 4px; font-size: 13px; color: rgba(255,255,255,0.2); font-style: italic; }
      .weekend .day-header { color: rgba(255,180,120,0.7); }
      .weekend.is-today .day-header { color: #FFB478; }

      /* --- Calendar grid view --- */
      .cal-grid { padding: 12px 16px; }
      .cal-header-row {
        display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
        margin-bottom: 6px;
      }
      .cal-header-cell {
        text-align: center; font-size: 11px; font-weight: 600;
        color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px;
        padding: 4px 0;
      }
      .cal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; align-items: stretch; }
      .cal-day {
        background: rgba(255,255,255,0.03); border-radius: 8px;
        padding: 6px; position: relative;
      }
      .cal-today { background: var(--today-bg); outline: 2px solid #4ECDC4; outline-offset: -2px; }
      .cal-outside { opacity: 0.3; }
      .cal-weekend { background: rgba(255,180,120,0.04); }
      .cal-date {
        font-size: 13px; font-weight: 600; color: var(--muted);
        margin-bottom: 4px;
      }
      .cal-today .cal-date { color: #4ECDC4; font-size: 15px; }
      .cal-events { display: flex; flex-direction: column; gap: 2px; }
      .cal-event {
        padding: 3px 6px; border-radius: 4px;
        background: rgba(255,255,255,0.05); font-size: 11px;
        line-height: 1.3; overflow: hidden; white-space: nowrap;
        text-overflow: ellipsis; display: flex; gap: 4px; align-items: baseline;
      }
      .cal-event-time { color: var(--muted); font-size: 10px; font-variant-numeric: tabular-nums; flex-shrink: 0; }
      .cal-event-text { overflow: hidden; text-overflow: ellipsis; color: #d0d0d0; }
      .cal-drive { opacity: 0.5; font-style: italic; }
    `;
  }
}

customElements.define("katja-schedule-card", KatjaScheduleCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "katja-schedule-card",
  name: `Katja Schedule v${CARD_VERSION}`,
  description: "14-day family schedule with schedule/calendar views, color-coded events, flight badges.",
  preview: false,
});

console.info(`%c KATJA-SCHEDULE-CARD %c v${CARD_VERSION} `, "background: #4ECDC4; color: #1e1e2e; font-weight: bold;", "background: #1e1e2e; color: #4ECDC4;");
