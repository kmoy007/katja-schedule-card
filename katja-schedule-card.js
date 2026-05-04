/**
 * Katja Schedule Card — custom Lovelace card for the Katja Schedule integration.
 *
 * Three views: Overview (default), Schedule, Calendar.
 * Tap event → detail modal with drive/flight recheck + action buttons.
 */

const CARD_VERSION = "0.11.0";

const PERSON_COLORS = {
  katja: "#FF6B6B", ken: "#4ECDC4", caleb: "#45B7D1",
  sam: "#96CEB4", shared: "#FFEAA7",
};

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT_MON = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

class KatjaScheduleCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._events = [];
    this._lastFetch = 0;
    this._fetchInterval = 5 * 60 * 1000;
    this._view = "overview";
    this._detailEvent = null;
    this._recheckResult = null;
    this._recheckLoading = false;
    this._actionLoading = false;
    this._actionResult = null;
    this._originPickerMode = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (Date.now() - this._lastFetch > this._fetchInterval) this._fetchEvents();
  }

  setConfig(config) {
    if (!config.calendars || !config.calendars.length) throw new Error("Define at least one calendar entity.");
    this._config = { title: "Family Schedule", ...config };
    this._render();
  }

  getCardSize() { return 12; }

  // ====================== DATA ======================

  async _fetchEvents() {
    if (!this._hass || !this._config.calendars) return;
    this._lastFetch = Date.now();
    const now = this._pacificNow();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start); end.setDate(end.getDate() + 35);
    const all = [];
    for (const cal of this._config.calendars) {
      try {
        const events = await this._hass.callApi("GET",
          `calendars/${cal.entity}?start=${start.toISOString()}&end=${end.toISOString()}`);
        for (const ev of events || [])
          all.push({ ...ev, _color: cal.color || PERSON_COLORS[cal.label?.toLowerCase()] || "#888",
                     _label: cal.label || cal.entity.split("_").pop() });
      } catch (e) { console.warn(`Failed to fetch from ${cal.entity}:`, e); }
    }
    const seen = new Set(), deduped = [];
    for (const ev of all) {
      const key = `${ev.summary||""}|${ev.start?.dateTime||ev.start?.date||""}`;
      if (!seen.has(key)) { seen.add(key); deduped.push(ev); }
    }
    this._events = deduped;
    this._render();
  }

  _groupByDate(events) {
    const g = {};
    for (const ev of events) {
      const ds = (ev.start?.dateTime || ev.start?.date || "").slice(0, 10);
      if (ds) (g[ds] = g[ds] || []).push(ev);
    }
    for (const d of Object.keys(g))
      g[d].sort((a,b) => (a.start?.dateTime||a.start?.date||"").localeCompare(b.start?.dateTime||b.start?.date||""));
    return g;
  }

  // ====================== HELPERS ======================

  _fmt(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  _pacificNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })); }
  _todayStr() { return this._fmt(this._pacificNow()); }
  _tomorrowStr() { const t = this._pacificNow(); t.setDate(t.getDate()+1); return this._fmt(t); }
  _isToday(ds) { return ds === this._todayStr(); }
  _isTomorrow(ds) { return ds === this._tomorrowStr(); }
  _fmtTs(iso) { try { return new Date(iso).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}); } catch(_) { return iso; } }

  _formatDateHeader(ds) {
    const d = new Date(ds+"T12:00:00"), day = DAY_NAMES[d.getDay()], month = MONTH_NAMES[d.getMonth()];
    if (this._isToday(ds)) return `Today — ${day}, ${month} ${d.getDate()}`;
    if (this._isTomorrow(ds)) return `Tomorrow — ${day}, ${month} ${d.getDate()}`;
    return `${day}, ${month} ${d.getDate()}`;
  }

  _formatTime(ev) {
    const dt = ev.start?.dateTime; if (!dt) return "All day";
    const d = new Date(dt); let h = d.getHours(), m = d.getMinutes(), ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12; if (h === 0) h = 12;
    const mStr = m < 10 ? `0${m}` : m;
    const endDt = ev.end?.dateTime;
    if (endDt) {
      const ed = new Date(endDt); let eh = ed.getHours(), em = ed.getMinutes(), eampm = eh >= 12 ? "PM" : "AM";
      if (eh > 12) eh -= 12; if (eh === 0) eh = 12;
      return ampm === eampm ? `${h}:${mStr}–${eh}:${em<10?"0"+em:em} ${eampm}` : `${h}:${mStr} ${ampm}–${eh}:${em<10?"0"+em:em} ${eampm}`;
    }
    return `${h}:${mStr} ${ampm}`;
  }

  _formatTimeShort(ev) {
    const dt = ev.start?.dateTime; if (!dt) return "";
    const d = new Date(dt); let h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? "p" : "a";
    if (h > 12) h -= 12; if (h === 0) h = 12;
    return m === 0 ? `${h}${ap}` : `${h}:${m<10?"0"+m:m}${ap}`;
  }

  _isDrive(s) { return s && s.toLowerCase().includes("drive"); }
  _isFlight(s) { return s && (s.includes("✈") || s.toLowerCase().includes("flight") || s.toLowerCase().includes("lands")); }
  _hasAddress(ev) { return !!(ev.location && ev.location.trim().length > 3); }
  _hasArrow(ev) { return (ev.summary||"").includes("→") || (ev.location||"").includes("→"); }

  _getDaysFromToday(n) {
    const days = [], now = this._pacificNow();
    for (let i = 0; i < n; i++) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+i); days.push(this._fmt(d)); }
    return days;
  }

  _getMonAlignedDays() {
    // Start from today, show 28 days (4 weeks)
    const now = this._pacificNow(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = [];
    for (let i = 0; i < 28; i++) { const d = new Date(today); d.setDate(today.getDate()+i); days.push(this._fmt(d)); }
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
      if (s?.state && s.state !== "unknown" && s.state !== "unavailable") {
        const mins = Math.round((Date.now() - new Date(s.state).getTime()) / 60000);
        syncText = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.round(mins/60)}h ago`;
      }
    }
    return { pendingCount, syncText };
  }

  _switchView(v) { this._view = v; this._detailEvent = null; this._render(); }
  _openDetail(ev) { this._detailEvent = ev; this._recheckResult = null; this._recheckLoading = false; this._actionResult = null; this._actionLoading = false; this._originPickerMode = false; this._render(); }
  _closeDetail() { this._detailEvent = null; this._recheckResult = null; this._actionResult = null; this._originPickerMode = false; this._render(); }

  // ====================== RECHECK ======================

  async _recheckDriveWithOrigin(ev, origin) {
    if (!this._hass) return;
    this._recheckLoading = true; this._originPickerMode = false; this._render();
    try {
      const destination = ev.location || "";
      this._recheckResult = await this._hass.callWS({
        type: "katja_schedule/refresh_drive", origin, destination,
      });
    } catch (e) { this._recheckResult = { ok: false, error: e.message }; }
    this._recheckLoading = false; this._render();
  }

  async _recheckDrive(ev) {
    if (!this._hass) return;
    this._recheckLoading = true; this._render();
    try {
      let origin = "", destination = "";
      for (const text of [ev.summary||"", ev.location||""]) {
        const parts = text.split("→").map(s => s.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          origin = parts[0].replace(/^[🚗\s]*(?:drive\s+)?/i, "").trim();
          destination = parts[1].trim();
          break;
        }
      }
      if (!origin || !destination) {
        this._recheckResult = { ok: false, error: "Could not parse origin → destination" };
        this._recheckLoading = false; this._render(); return;
      }
      this._recheckResult = await this._hass.callWS({
        type: "katja_schedule/refresh_drive", origin, destination,
      });
    } catch (e) { this._recheckResult = { ok: false, error: e.message }; }
    this._recheckLoading = false; this._render();
  }

  async _recheckFlight(ev) {
    if (!this._hass) return;
    this._recheckLoading = true; this._render();
    try {
      const desc = ev.description || ev.summary || "";
      const flightMatch = desc.match(/Flight:\s*(\S+)\s+(\S+)→(\S+)/);
      const msg = { type: "katja_schedule/refresh_flight" };
      if (flightMatch) { msg.flight_number = flightMatch[1]; msg.origin = flightMatch[2]; msg.destination = flightMatch[3]; }
      else { const m = (ev.summary||"").match(/\b([A-Z]{2}\d{1,4})\b/); msg.flight_number = m ? m[1] : "unknown"; }
      msg.date = (ev.start?.dateTime || ev.start?.date || "").slice(0, 10);
      this._recheckResult = await this._hass.callWS(msg);
    } catch (e) { this._recheckResult = { ok: false, error: e.message }; }
    this._recheckLoading = false; this._render();
  }

  async _sendAgentAction(message) {
    if (!this._hass) return;
    this._actionLoading = true; this._render();
    try {
      this._actionResult = await this._hass.callWS({
        type: "katja_schedule/agent_action", message,
      });
    } catch (e) { this._actionResult = { ok: false, error: e.message }; }
    this._actionLoading = false; this._render();
  }

  // ====================== RENDER ======================

  _render() {
    if (!this.shadowRoot) return;
    const grouped = this._groupByDate(this._events);
    const { pendingCount, syncText } = this._getSensorData();

    let body = "";
    if (this._view === "overview") body = this._renderOverview(grouped);
    else if (this._view === "schedule") body = this._renderSchedule(grouped);
    else body = this._renderCalendarGrid(this._getMonAlignedDays(), grouped);

    const modal = this._detailEvent ? this._renderDetailModal(this._detailEvent) : "";

    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <ha-card><div class="card">
        <div class="header">
          <span class="title">${this._config.title || "Family Schedule"}</span>
          <div class="view-toggle">
            ${["overview","schedule","calendar"].map(v =>
              `<button class="toggle-btn ${this._view===v?"active":""}" data-view="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`
            ).join("")}
          </div>
          <div class="meta">
            ${pendingCount > 0 ? `<span class="badge">${pendingCount} pending</span>` : ""}
            ${syncText ? `<span>Synced ${syncText}</span>` : ""}
            <span class="version">v${CARD_VERSION}</span>
          </div>
        </div>
        ${body}${modal}
      </div></ha-card>`;

    // Bind events
    this.shadowRoot.querySelectorAll(".toggle-btn").forEach(btn => btn.addEventListener("click", () => this._switchView(btn.dataset.view)));
    this.shadowRoot.querySelectorAll("[data-event-idx]").forEach(el => el.addEventListener("click", () => this._openDetail(this._events[parseInt(el.dataset.eventIdx)])));
    this.shadowRoot.querySelector(".modal-close")?.addEventListener("click", () => this._closeDetail());
    const backdrop = this.shadowRoot.querySelector(".modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", (e) => { if (e.target === backdrop) this._closeDetail(); });
    this.shadowRoot.querySelector(".recheck-drive")?.addEventListener("click", () => this._recheckDrive(this._detailEvent));
    this.shadowRoot.querySelector(".recheck-flight")?.addEventListener("click", () => this._recheckFlight(this._detailEvent));
    this.shadowRoot.querySelector(".recheck-check")?.addEventListener("click", () => this._recheckDrive(this._detailEvent));
    this.shadowRoot.querySelectorAll(".origin-btn").forEach(btn => btn.addEventListener("click", () => this._recheckDriveWithOrigin(this._detailEvent, btn.dataset.origin)));
    this.shadowRoot.querySelector(".action-update")?.addEventListener("click", () => {
      const r = this._recheckResult, ev = this._detailEvent;
      if (!r || !ev) return;
      this._sendAgentAction(
        `Update the drive time for "${ev.summary}" on ${(ev.start?.dateTime||ev.start?.date||"").slice(0,10)} to ${r.duration_text}. ` +
        `Route: ${r.distance_text} via ${r.summary||"—"} (includes ${r.traffic_note||"traffic"} estimate).`
      );
    });
    this.shadowRoot.querySelector(".action-add-drive")?.addEventListener("click", () => {
      const r = this._recheckResult, ev = this._detailEvent;
      if (!r || !ev) return;
      const o = r.origin||{}, d = r.destination||{};
      const evDate = (ev.start?.dateTime||ev.start?.date||"").slice(0,10);
      const evTime = this._formatTime(ev);
      this._sendAgentAction(
        `Add a 🚗 drive row on ${evDate} before "${ev.summary}" (${evTime}). ` +
        `Drive from ${o.resolved||o.input||"?"} to ${d.resolved||d.input||"?"}, ` +
        `${r.duration_text}, ${r.distance_text} via ${r.summary||"—"}. ` +
        `This includes ${r.traffic_note||"traffic"} estimate. Set departure time so arrival is before ${evTime}.`
      );
    });
  }

  // ====================== DETAIL MODAL ======================

  _renderDetailModal(ev) {
    const summary = ev.summary || "", time = this._formatTime(ev);
    const date = (ev.start?.dateTime || ev.start?.date || "").slice(0, 10);
    const dateLabel = this._formatDateHeader(date);
    const location = ev.location || "", description = ev.description || "";
    const isDrive = this._isDrive(summary), isFlight = this._isFlight(summary);
    const hasAddress = this._hasAddress(ev), hasArrow = this._hasArrow(ev);
    const color = ev._color || "#888";

    // Recheck section
    let recheckSection = "";
    if (isFlight) {
      recheckSection = `<button class="recheck-btn recheck-flight" ${this._recheckLoading?"disabled":""}>${this._recheckLoading?"⏳ Checking...":"🔄 Recheck Flight"}</button>`;
    } else if (isDrive && hasArrow) {
      recheckSection = `<button class="recheck-btn recheck-drive" ${this._recheckLoading?"disabled":""}>${this._recheckLoading?"⏳ Checking...":"🔄 Recheck Drive Time"}</button>`;
    } else if (hasAddress) {
      recheckSection = `
        <div class="origin-picker">
          <div class="origin-label">Check drive time from:</div>
          <div class="origin-buttons">
            <button class="origin-btn" data-origin="home" ${this._recheckLoading?"disabled":""}>🏠 Home</button>
            <button class="origin-btn" data-origin="nz consulate" ${this._recheckLoading?"disabled":""}>🏢 Work</button>
          </div>
          <div class="origin-hint">For a custom route, use the web app's chat agent</div>
        </div>
        ${this._recheckLoading ? '<div style="text-align:center;color:var(--muted);padding:8px">⏳ Checking...</div>' : ""}`;
    }

    // Result section
    let resultSection = "";
    const r = this._recheckResult;
    if (r) {
      if (r.ok && r.duration_text) {
        const o = r.origin||{}, d = r.destination||{};
        const checkedAt = this._fmtTs(r.fetched_at);
        const depTime = r.departure_time_resolved && r.departure_time_resolved !== "now"
          ? `Departure: ${this._fmtTs(r.departure_time_resolved)}`
          : "Departure: now (live traffic)";

        let trafficLine;
        if (r.has_traffic === false) {
          trafficLine = `<div class="traffic-warn">⚠️ <strong>No traffic data</strong> — base estimate only. Actual time may be longer.<br><span class="traffic-meta">${depTime} · Checked ${checkedAt}</span></div>`;
        } else {
          trafficLine = `<div class="traffic-ok">⚡ Includes ${r.traffic_note||"current traffic"} estimate${r.duration_without_traffic_text ? ` (${r.duration_without_traffic_text} without traffic)` : ""}<br><span class="traffic-meta">${depTime} · Checked ${checkedAt}</span></div>`;
        }

        // Action buttons
        let actions = "";
        if (!this._actionResult) {
          if (isDrive) {
            actions = `<button class="action-btn action-update" ${this._actionLoading?"disabled":""}>${this._actionLoading?"⏳ Updating...": `✓ Update to ${r.duration_text} (with traffic)`}</button>`;
          } else {
            actions = `<button class="action-btn action-add-drive" ${this._actionLoading?"disabled":""}>${this._actionLoading?"⏳ Adding...": `＋ Add ${r.duration_text} drive row before this event (with traffic)`}</button>`;
          }
        }

        resultSection = `<div class="recheck-result ok">
          <div class="recheck-route"><span class="recheck-label">From:</span> ${o.resolved||o.input||"?"}</div>
          <div class="recheck-route"><span class="recheck-label">To:</span> ${d.resolved||d.input||"?"}</div>
          <div class="recheck-duration"><strong>${r.duration_text}</strong></div>
          ${trafficLine}
          <div class="recheck-via">${r.distance_text} via ${r.summary||"—"}</div>
          ${actions}
        </div>`;
      } else if (r.ok && r.status) {
        const est = r.estimated_arrival_local || r.destination?.scheduled_local || "";
        resultSection = `<div class="recheck-result ok"><strong>${r.status}</strong>${est?" — arrival "+est:""}${r.gate?" · gate "+r.gate:""}</div>`;
      } else if (!r.ok) {
        resultSection = `<div class="recheck-result err">${r.error || "Unknown error"}</div>`;
      }
    }

    // Agent action result
    let actionSection = "";
    if (this._actionResult) {
      if (this._actionResult.ok) {
        actionSection = `<div class="action-result ok">✓ ${this._actionResult.text || "Done"}</div>`;
      } else {
        actionSection = `<div class="action-result err">${this._actionResult.error || "Action failed"}</div>`;
      }
    }

    return `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-dot" style="background:${color}"></span>
            <span class="modal-title">${summary}</span>
            <button class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="modal-row"><span class="modal-label">When</span><span>${dateLabel}, ${time}</span></div>
            ${location ? `<div class="modal-row"><span class="modal-label">Where</span><span>${location}</span></div>` : ""}
            ${description && description !== location ? `<div class="modal-row"><span class="modal-label">Details</span><span class="modal-desc">${description}</span></div>` : ""}
            <div class="modal-row"><span class="modal-label">Who</span><span>${ev._label || "—"}</span></div>
            ${recheckSection}
            ${resultSection}
            ${actionSection}
          </div>
        </div>
      </div>`;
  }

  // ====================== OVERVIEW / SCHEDULE / CALENDAR ======================

  _renderOverview(grouped) {
    const todayDs = this._todayStr(), tomorrowDs = this._tomorrowStr();
    return `<div class="overview-top"><div class="overview-col">${this._renderDay(todayDs, grouped[todayDs]||[])}</div><div class="overview-col">${this._renderDay(tomorrowDs, grouped[tomorrowDs]||[])}</div></div><div class="overview-divider"></div>${this._renderCalendarGrid(this._getMonAlignedDays(), grouped)}`;
  }

  _renderSchedule(grouped) {
    return `<div class="days">${this._getDaysFromToday(14).map(ds => this._renderDay(ds, grouped[ds]||[])).join("")}</div>`;
  }

  _renderDay(ds, events) {
    const isToday = this._isToday(ds), isTomorrow = this._isTomorrow(ds);
    const d = new Date(ds+"T12:00:00"), isWeekend = d.getDay()===0||d.getDay()===6;
    let cls = "day"; if (isToday) cls+=" is-today"; if (isTomorrow) cls+=" is-tomorrow"; if (isWeekend) cls+=" weekend";
    return `<div class="${cls}"><div class="day-header"><span class="day-dot"></span>${this._formatDateHeader(ds)}${events.length>0&&!isToday?`<span class="event-count">${events.length} event${events.length!==1?"s":""}</span>`:""}</div><div class="events">${events.length===0?'<div class="no-events">No events</div>':events.map(ev=>this._renderEvent(ev)).join("")}</div></div>`;
  }

  _renderEvent(ev) {
    const summary = ev.summary||"", isDrive = this._isDrive(summary), idx = this._events.indexOf(ev);
    const isFlight = this._isFlight(summary), description = ev.description||"";
    let flightBadge = "";
    if (isFlight && description) { const m = description.match(/Flight:\s*(\S+)/); if (m) flightBadge = `<span class="flight-badge">✈ ${m[1]}</span>`; }
    return `<div class="event${isDrive?" is-drive":""}" data-event-idx="${idx}"><div class="event-time">${this._formatTime(ev)}</div><div class="event-body"><div class="event-summary"><span class="person-dot" style="background:${ev._color||"#888"}"></span>${summary} ${flightBadge}</div>${ev.location?`<div class="event-location">${ev.location}</div>`:""}</div></div>`;
  }

  _renderCalendarGrid(days, grouped) {
    const weeks = [], firstDate = new Date(days[0]+"T12:00:00");
    const jsDay = firstDate.getDay(), padBefore = jsDay===0?6:jsDay-1;
    const allDays = [];
    for (let i=padBefore;i>0;i--){const d=new Date(firstDate);d.setDate(d.getDate()-i);allDays.push({ds:this._fmt(d),outside:true});}
    for (const ds of days) allDays.push({ds,outside:false});
    while(allDays.length%7!==0){const last=new Date(allDays[allDays.length-1].ds+"T12:00:00");last.setDate(last.getDate()+1);allDays.push({ds:this._fmt(last),outside:true});}
    for(let i=0;i<allDays.length;i+=7)weeks.push(allDays.slice(i,i+7));
    return `<div class="cal-grid"><div class="cal-header-row">${DAY_SHORT_MON.map(d=>`<div class="cal-header-cell">${d}</div>`).join("")}</div>${weeks.map(week=>`<div class="cal-week">${week.map(({ds,outside})=>{const isToday=this._isToday(ds),d=new Date(ds+"T12:00:00"),evts=grouped[ds]||[],isWeekend=d.getDay()===0||d.getDay()===6;let cls="cal-day";if(isToday)cls+=" cal-today";if(outside)cls+=" cal-outside";if(isWeekend)cls+=" cal-weekend";if(ds<this._todayStr()&&!outside)cls+=" cal-past";return`<div class="${cls}"><div class="cal-date">${d.getDate()}</div><div class="cal-events">${evts.map(ev=>{const isDrive=this._isDrive(ev.summary||"");return`<div class="cal-event${isDrive?" cal-drive":""}" style="border-left:3px solid ${ev._color||"#888"}"><span class="cal-event-time">${this._formatTimeShort(ev)}</span><span class="cal-event-text">${ev.summary||""}</span></div>`;}).join("")}</div></div>`;}).join("")}</div>`).join("")}</div>`;
  }

  // ====================== STYLES ======================

  _getStyles() {
    return `
      :host { display: block; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #e0e0e0;
        --card-bg: var(--ha-card-background, #1e1e2e); --today-bg: rgba(255,255,255,0.08);
        --border: rgba(255,255,255,0.08); --muted: #8a8a9a; }
      .card { background: var(--card-bg); border-radius: 16px; overflow: hidden; position: relative; }
      .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }
      .header .title { font-size: 26px; font-weight: 700; color: #fff; }
      .header .meta { display: flex; gap: 16px; align-items: center; font-size: 14px; color: var(--muted); }
      .header .badge { background: #E0A020; color: #1e1e2e; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 12px; }
      .header .version { font-size: 11px; color: rgba(255,255,255,0.2); }
      .view-toggle { display: flex; background: rgba(255,255,255,0.06); border-radius: 20px; padding: 3px; }
      .toggle-btn { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 8px 16px; border-radius: 16px; font-size: 13px; font-weight: 600; transition: all 0.15s; }
      .toggle-btn.active { background: rgba(255,255,255,0.12); color: #fff; }
      .toggle-btn:hover:not(.active) { color: #ccc; }
      .overview-top { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid var(--border); }
      .overview-col:first-child { border-right: 1px solid var(--border); }
      .days { padding: 8px 0; }
      .day { padding: 0 20px; margin-bottom: 4px; }
      .day-header { display: flex; align-items: center; gap: 10px; padding: 14px 4px 10px; font-weight: 600; font-size: 16px; color: var(--muted); border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card-bg); z-index: 2; }
      .day.is-today .day-header { color: #fff; font-size: 22px; }
      .day.is-tomorrow .day-header { color: #ccc; font-size: 19px; }
      .day.is-today { background: var(--today-bg); border-radius: 12px; padding-top: 4px; padding-bottom: 8px; margin-bottom: 8px; }
      .day-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
      .day.is-today .day-dot { background: #4ECDC4; width: 10px; height: 10px; }
      .day.is-tomorrow .day-dot { background: #45B7D1; }
      .event-count { font-size: 13px; color: var(--muted); font-weight: 400; }
      .events { padding: 4px 0; }
      .event { display: grid; grid-template-columns: 90px 1fr; gap: 12px; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.03); align-items: start; cursor: pointer; border-radius: 8px; }
      .event:hover { background: rgba(255,255,255,0.04); }
      .event:last-child { border-bottom: none; }
      .event-time { font-size: 15px; font-variant-numeric: tabular-nums; color: var(--muted); text-align: right; }
      .day.is-today .event-time { font-size: 18px; color: #bbb; }
      .event-body { min-width: 0; }
      .event-summary { font-size: 16px; font-weight: 500; color: #e0e0e0; display: flex; align-items: center; gap: 8px; line-height: 1.3; }
      .day.is-today .event-summary { font-size: 19px; color: #fff; }
      .event-summary .person-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .event-location { font-size: 14px; color: var(--muted); margin-top: 2px; }
      .event.is-drive .event-summary { font-style: italic; color: var(--muted); font-weight: 400; }
      .event.is-drive .event-time { color: rgba(255,255,255,0.25); }
      .flight-badge { display: inline-flex; align-items: center; gap: 4px; background: rgba(78,205,196,0.15); color: #4ECDC4; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 8px; }
      .no-events { padding: 8px 4px; font-size: 15px; color: rgba(255,255,255,0.2); font-style: italic; }
      .weekend .day-header { color: rgba(255,180,120,0.7); }
      .cal-grid { padding: 12px 16px; }
      .cal-header-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 6px; }
      .cal-header-cell { text-align: center; font-size: 14px; font-weight: 600; color: var(--muted); text-transform: uppercase; }
      .cal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; align-items: stretch; }
      .cal-day { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 6px; }
      .cal-today { background: var(--today-bg); outline: 2px solid #4ECDC4; outline-offset: -2px; }
      .cal-outside { opacity: 0.3; } .cal-past { opacity: 0.4; }
      .cal-weekend { background: rgba(255,180,120,0.04); }
      .cal-date { font-size: 16px; font-weight: 600; color: var(--muted); margin-bottom: 6px; }
      .cal-today .cal-date { color: #4ECDC4; font-size: 18px; }
      .cal-events { display: flex; flex-direction: column; gap: 2px; }
      .cal-event { padding: 4px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); font-size: 13px; line-height: 1.35; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: flex; gap: 5px; align-items: baseline; }
      .cal-event-time { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; flex-shrink: 0; }
      .cal-event-text { overflow: hidden; text-overflow: ellipsis; color: #d0d0d0; font-size: 13px; }
      .cal-drive { opacity: 0.5; font-style: italic; }

      /* Modal */
      .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; }
      .modal { background: #2a2a3e; border-radius: 16px; width: min(520px, 90vw); max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
      .modal-header { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border); }
      .modal-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
      .modal-title { font-size: 20px; font-weight: 600; color: #fff; flex: 1; }
      .modal-close { background: transparent; border: none; color: var(--muted); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
      .modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
      .modal-body { padding: 16px 20px; }
      .modal-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 15px; line-height: 1.4; }
      .modal-row:last-child { border-bottom: none; }
      .modal-label { color: var(--muted); font-size: 13px; font-weight: 600; text-transform: uppercase; min-width: 60px; padding-top: 2px; }
      .modal-desc { font-size: 13px; color: #aaa; line-height: 1.4; }

      /* Recheck */
      .recheck-btn { display: block; width: 100%; margin-top: 14px; padding: 12px; border: none; border-radius: 10px; background: rgba(78,205,196,0.15); color: #4ECDC4; font-size: 15px; font-weight: 600; cursor: pointer; }
      .recheck-btn:hover { background: rgba(78,205,196,0.25); }
      .recheck-btn:disabled { opacity: 0.5; cursor: wait; }

      .origin-picker { margin-top: 14px; }
      .origin-label { font-size: 14px; font-weight: 600; color: #ccc; margin-bottom: 8px; }
      .origin-buttons { display: flex; gap: 8px; margin-bottom: 6px; }
      .origin-btn { flex: 1; padding: 12px; border: 2px solid rgba(255,255,255,0.12); border-radius: 10px; background: transparent; font-size: 14px; font-weight: 600; cursor: pointer; color: #4ECDC4; }
      .origin-btn:hover { border-color: #4ECDC4; background: rgba(78,205,196,0.08); }
      .origin-btn:disabled { opacity: 0.5; cursor: wait; }
      .origin-hint { font-size: 11px; color: var(--muted); }

      .recheck-result { margin-top: 12px; padding: 14px; border-radius: 10px; font-size: 14px; line-height: 1.5; }
      .recheck-result.ok { background: rgba(78,205,196,0.08); color: #4ECDC4; }
      .recheck-result.err { background: rgba(255,100,100,0.1); color: #FF6B6B; }
      .recheck-route { font-size: 13px; margin-bottom: 3px; color: #bbb; }
      .recheck-label { color: var(--muted); font-weight: 600; font-size: 11px; text-transform: uppercase; margin-right: 4px; }
      .recheck-duration { margin-top: 8px; font-size: 18px; }
      .recheck-via { font-size: 12px; color: var(--muted); margin-top: 4px; }
      .traffic-ok { margin-top: 6px; font-size: 13px; color: #4ECDC4; }
      .traffic-warn { margin-top: 6px; font-size: 13px; color: #FF6B6B; background: rgba(255,100,100,0.1); padding: 8px; border-radius: 6px; }
      .traffic-meta { font-size: 11px; opacity: 0.7; }

      .action-btn { display: block; width: 100%; margin-top: 10px; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
      .action-btn:disabled { opacity: 0.5; cursor: wait; }
      .action-btn.action-update { background: #2E8B57; color: white; }
      .action-btn.action-update:hover { background: #1F6B41; }
      .action-btn.action-add-drive { background: rgba(78,205,196,0.15); color: #4ECDC4; }
      .action-btn.action-add-drive:hover { background: rgba(78,205,196,0.25); }

      .action-result { margin-top: 10px; padding: 12px; border-radius: 10px; font-size: 13px; line-height: 1.4; }
      .action-result.ok { background: rgba(46,139,87,0.15); color: #4ECDC4; }
      .action-result.err { background: rgba(255,100,100,0.1); color: #FF6B6B; }
    `;
  }
}

customElements.define("katja-schedule-card", KatjaScheduleCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "katja-schedule-card",
  name: `Katja Schedule v${CARD_VERSION}`,
  description: `v${CARD_VERSION} — Family schedule with drive/flight recheck + agent actions.`,
  preview: false,
});
console.info(`%c KATJA-SCHEDULE-CARD %c v${CARD_VERSION} `, "background: #4ECDC4; color: #1e1e2e; font-weight: bold;", "background: #1e1e2e; color: #4ECDC4;");
