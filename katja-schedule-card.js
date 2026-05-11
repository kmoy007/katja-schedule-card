/**
 * Katja Schedule Card — custom Lovelace card for the Katja Schedule integration.
 *
 * Three views: Overview (default), Schedule, Calendar.
 * Tap event → detail modal with drive/flight recheck + action buttons.
 */

const CARD_VERSION = "0.38.3";
// Day View constants — kept aligned with the web template's
// CAL_HOUR_PX / CAL_DAY_START_HOUR / CAL_DAY_END_HOUR (see
// templates/schedule.html ~line 5457) so the two surfaces render
// the same hour grid at the same scale.
const DV_HOUR_PX = 32;
const DV_DAY_START = 6;
const DV_DAY_END = 23;

/** Escape any string that originates from external data (calendar events,
 *  Google Maps responses, flight APIs) before it lands in an innerHTML
 *  template. A malicious calendar invite could otherwise inject markup
 *  into the HA dashboard's shadow DOM. Cheap and idempotent — call it on
 *  every interpolated value that isn't a literal we control. */
function _esc(s) {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Theme tokens fall back to these when a theme leaves them unset, so older
// color-only themes keep working unchanged.
const THEME_DEFAULTS = {
  font: "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontDisplay: null,                  // null → fall back to `font`
  fontMono: "ui-monospace, 'SF Mono', Menlo, monospace",
  // Typography
  titleSize: "26px", titleWeight: "700",
  titleTransform: "none", titleLetterSpacing: "0",
  dayHeaderSize: "16px", dayHeaderWeight: "600",
  dayHeaderTransform: "none", dayHeaderLetterSpacing: "0",
  todayHeaderSize: "22px",
  eventSummarySize: "16px", eventSummaryWeight: "500",
  eventTimeSize: "15px",
  // Shape
  radius: "16px", radiusSm: "8px", radiusXs: "3px",
  cardShadow: "none",
  modalShadow: "0 20px 60px rgba(0,0,0,0.5)",
  // Density: regular | compact | spacious
  density: "regular",
  // Derived text (used to fix hard-coded colors that broke light themes).
  // Each defaults to the theme's `text` if unset.
  eventTextStrong: null,
  eventTextSoft: null,
  // Optional escape hatches
  customCss: "",
};

const DENSITY = {
  compact:  { cardPad: "12px 16px 10px", dayPad: "0 12px", eventPadV: "6px",  eventPadH: "4px", eventGap: "8px",  eventCols: "78px 1fr",  dayHeaderPad: "10px 4px 8px",  daySpacing: "2px",  calPad: "6px 8px",   calMin: "52px", overviewMin: "260px", headerGap: "10px" },
  regular:  { cardPad: "20px 24px 16px", dayPad: "0 20px", eventPadV: "8px",  eventPadH: "4px", eventGap: "12px", eventCols: "90px 1fr",  dayHeaderPad: "14px 4px 10px", daySpacing: "4px",  calPad: "8px 12px",  calMin: "60px", overviewMin: "300px", headerGap: "12px" },
  spacious: { cardPad: "28px 32px 22px", dayPad: "0 28px", eventPadV: "12px", eventPadH: "6px", eventGap: "16px", eventCols: "100px 1fr", dayHeaderPad: "18px 4px 12px", daySpacing: "8px",  calPad: "12px 16px", calMin: "72px", overviewMin: "340px", headerGap: "16px" },
};

const THEMES = {
  none: {
    // Inherit colors, fonts, and shape from the active HA dashboard theme.
    // Use this when the card should disappear into the rest of your view.
    // Every token resolves to a HA CSS variable so a theme switch in HA
    // (or a different dashboard) re-skins the card automatically.
    name: "None (HA dashboard)",
    cardBg: "var(--ha-card-background, var(--card-background-color, #fff))",
    text: "var(--primary-text-color)",
    muted: "var(--secondary-text-color)",
    border: "var(--divider-color)",
    todayBg: "color-mix(in srgb, var(--primary-color) 8%, transparent)",
    accent: "var(--primary-color)",
    accentBg: "color-mix(in srgb, var(--primary-color) 5%, transparent)",
    headerBg: "var(--ha-card-background, var(--card-background-color))",
    headerText: "var(--primary-text-color)",
    eventHover: "color-mix(in srgb, var(--primary-text-color) 5%, transparent)",
    calDayBg: "color-mix(in srgb, var(--primary-text-color) 3%, transparent)",
    calTodayBg: "color-mix(in srgb, var(--primary-color) 12%, transparent)",
    weekendBg: "color-mix(in srgb, var(--warning-color, #ffb060) 6%, transparent)",
    modalBg: "var(--ha-card-background, var(--card-background-color, #fff))",
    modalText: "var(--primary-text-color)",
    font: "var(--paper-font-body1_-_font-family, var(--ha-font-family-body, 'Segoe UI', system-ui, sans-serif))",
    fontDisplay: "var(--paper-font-headline_-_font-family, var(--ha-font-family-body, 'Segoe UI', system-ui, sans-serif))",
    radius: "var(--ha-card-border-radius, 12px)",
    radiusSm: "8px", radiusXs: "4px",
    cardShadow: "var(--ha-card-box-shadow, none)",
    eventTextStrong: "var(--primary-text-color)",
    eventTextSoft: "var(--secondary-text-color)",
  },
  dark: {
    name: "Dark",
    cardBg: "#1e1e2e", text: "#e0e0e0", muted: "#8a8a9a",
    border: "rgba(255,255,255,0.08)", todayBg: "rgba(255,255,255,0.08)",
    accent: "#4ECDC4", accentBg: "rgba(78,205,196,0.04)",
    headerBg: "#1e1e2e", headerText: "#fff",
    eventHover: "rgba(255,255,255,0.04)",
    calDayBg: "rgba(255,255,255,0.03)", calTodayBg: "rgba(78,205,196,0.1)",
    weekendBg: "rgba(255,180,120,0.04)",
    modalBg: "#2a2a3e", modalText: "#e0e0e0",
  },
  light: {
    name: "Light",
    cardBg: "#ffffff", text: "#1D232A", muted: "#5A6475",
    border: "#E2E6EC", todayBg: "rgba(31,78,120,0.06)",
    accent: "#1F4E78", accentBg: "rgba(31,78,120,0.03)",
    headerBg: "#ffffff", headerText: "#1D232A",
    eventHover: "rgba(0,0,0,0.03)",
    calDayBg: "#F8F9FA", calTodayBg: "rgba(31,78,120,0.08)",
    weekendBg: "rgba(255,180,120,0.06)",
    modalBg: "#ffffff", modalText: "#1D232A",
  },
  midnight: {
    name: "Midnight",
    cardBg: "#0d1117", text: "#c9d1d9", muted: "#6e7681",
    border: "rgba(255,255,255,0.06)", todayBg: "rgba(88,166,255,0.08)",
    accent: "#58a6ff", accentBg: "rgba(88,166,255,0.04)",
    headerBg: "#0d1117", headerText: "#f0f6fc",
    eventHover: "rgba(255,255,255,0.03)",
    calDayBg: "rgba(255,255,255,0.02)", calTodayBg: "rgba(88,166,255,0.12)",
    weekendBg: "rgba(255,180,120,0.03)",
    modalBg: "#161b22", modalText: "#c9d1d9",
  },
  warm: {
    name: "Warm",
    cardBg: "#1a1512", text: "#e8ddd0", muted: "#9a8a7a",
    border: "rgba(255,220,180,0.1)", todayBg: "rgba(255,180,100,0.1)",
    accent: "#FFB060", accentBg: "rgba(255,180,100,0.05)",
    headerBg: "#1a1512", headerText: "#f0e6d8",
    eventHover: "rgba(255,220,180,0.05)",
    calDayBg: "rgba(255,220,180,0.03)", calTodayBg: "rgba(255,180,100,0.12)",
    weekendBg: "rgba(255,180,120,0.06)",
    modalBg: "#231e18", modalText: "#e8ddd0",
  },
  forest: {
    name: "Forest",
    cardBg: "#0F1F18", text: "#D8E6DC", muted: "#7A9384",
    border: "rgba(120,200,150,0.08)", todayBg: "rgba(120,200,150,0.08)",
    accent: "#7DCFA0", accentBg: "rgba(125,207,160,0.04)",
    headerBg: "#0F1F18", headerText: "#E8F3EC",
    eventHover: "rgba(125,207,160,0.04)",
    calDayBg: "rgba(125,207,160,0.03)", calTodayBg: "rgba(125,207,160,0.12)",
    weekendBg: "rgba(220,180,120,0.05)",
    modalBg: "#162A21", modalText: "#D8E6DC",
  },
  rose: {
    name: "Rose",
    cardBg: "#FFF5F7", text: "#3A1F2A", muted: "#8C5A6F",
    border: "#F2D6DD", todayBg: "rgba(214,80,118,0.06)",
    accent: "#D65076", accentBg: "rgba(214,80,118,0.04)",
    headerBg: "#FFF5F7", headerText: "#3A1F2A",
    eventHover: "rgba(214,80,118,0.04)",
    calDayBg: "#FBE9EE", calTodayBg: "rgba(214,80,118,0.10)",
    weekendBg: "rgba(255,180,120,0.08)",
    modalBg: "#FFF5F7", modalText: "#3A1F2A",
  },
  ocean: {
    name: "Ocean",
    cardBg: "#0A1A2A", text: "#CFE3F0", muted: "#6E90AC",
    border: "rgba(100,180,230,0.08)", todayBg: "rgba(100,180,230,0.10)",
    accent: "#4DB6E5", accentBg: "rgba(77,182,229,0.05)",
    headerBg: "#0A1A2A", headerText: "#E8F4FB",
    eventHover: "rgba(77,182,229,0.04)",
    calDayBg: "rgba(77,182,229,0.03)", calTodayBg: "rgba(77,182,229,0.13)",
    weekendBg: "rgba(255,200,140,0.04)",
    modalBg: "#102438", modalText: "#CFE3F0",
  },
  sunset: {
    name: "Sunset",
    cardBg: "#21121A", text: "#F2DACE", muted: "#A87A78",
    border: "rgba(255,150,120,0.10)", todayBg: "rgba(255,120,100,0.12)",
    accent: "#FF7A6E", accentBg: "rgba(255,122,110,0.05)",
    headerBg: "#21121A", headerText: "#FFE8DD",
    eventHover: "rgba(255,150,120,0.05)",
    calDayBg: "rgba(255,150,120,0.03)", calTodayBg: "rgba(255,122,110,0.14)",
    weekendBg: "rgba(255,200,120,0.06)",
    modalBg: "#2C1822", modalText: "#F2DACE",
  },
  mono: {
    name: "Mono",
    cardBg: "#FAFAFA", text: "#111111", muted: "#666666",
    border: "#D9D9D9", todayBg: "rgba(0,0,0,0.05)",
    accent: "#111111", accentBg: "rgba(0,0,0,0.03)",
    headerBg: "#FAFAFA", headerText: "#000000",
    eventHover: "rgba(0,0,0,0.04)",
    calDayBg: "#F0F0F0", calTodayBg: "rgba(0,0,0,0.08)",
    weekendBg: "rgba(0,0,0,0.04)",
    modalBg: "#FFFFFF", modalText: "#111111",
  },
  highContrast: {
    name: "High Contrast",
    cardBg: "#000000", text: "#FFFFFF", muted: "#BBBBBB",
    border: "rgba(255,255,255,0.25)", todayBg: "rgba(255,255,0,0.18)",
    accent: "#FFD300", accentBg: "rgba(255,211,0,0.10)",
    headerBg: "#000000", headerText: "#FFFFFF",
    eventHover: "rgba(255,255,255,0.10)",
    calDayBg: "rgba(255,255,255,0.06)", calTodayBg: "rgba(255,211,0,0.22)",
    weekendBg: "rgba(255,255,255,0.04)",
    modalBg: "#000000", modalText: "#FFFFFF",
  },
  sepia: {
    name: "Sepia",
    cardBg: "#F4ECD8", text: "#3B2F1F", muted: "#7A6A50",
    border: "#D9C8A4", todayBg: "rgba(120,80,40,0.08)",
    accent: "#8C5A2B", accentBg: "rgba(140,90,43,0.05)",
    headerBg: "#F4ECD8", headerText: "#2A2014",
    eventHover: "rgba(120,80,40,0.05)",
    calDayBg: "#EDE2C5", calTodayBg: "rgba(140,90,43,0.12)",
    weekendBg: "rgba(180,140,80,0.10)",
    modalBg: "#FAF3DF", modalText: "#3B2F1F",
    font: "Georgia, 'Times New Roman', serif",
    fontDisplay: "Georgia, 'Times New Roman', serif",
    titleLetterSpacing: "0.01em",
  },
  editorial: {
    // Magazine layout: serif display titles, generous spacing, sharp corners,
    // ALL-CAPS day headers with letter-spacing.
    name: "Editorial",
    cardBg: "#F5F0EB", text: "#1A1A2E", muted: "#6B7280",
    border: "rgba(0,0,0,0.10)", todayBg: "rgba(45,90,123,0.08)",
    accent: "#2D5A7B", accentBg: "rgba(45,90,123,0.04)",
    headerBg: "#F5F0EB", headerText: "#1A1A2E",
    eventHover: "rgba(45,90,123,0.04)",
    calDayBg: "#FFFFFF", calTodayBg: "rgba(45,90,123,0.10)",
    weekendBg: "rgba(196,149,106,0.08)",
    modalBg: "#FFFFFF", modalText: "#1A1A2E",
    font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontDisplay: "'DM Serif Display', Georgia, serif",
    titleSize: "34px", titleWeight: "400", titleLetterSpacing: "-0.01em",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.18em",
    dayHeaderSize: "13px", dayHeaderWeight: "700",
    todayHeaderSize: "26px",
    eventSummaryWeight: "400",
    radius: "0", radiusSm: "0", radiusXs: "0",
    cardShadow: "0 8px 32px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    density: "spacious",
    eventTextStrong: "#1A1A2E", eventTextSoft: "#6B7280",
  },
  terminal: {
    // Brutalist mono: monospace everywhere, ALL CAPS, square corners, tight.
    name: "Terminal",
    cardBg: "#0A0A0A", text: "#00FF66", muted: "#4A8060",
    border: "rgba(0,255,102,0.20)", todayBg: "rgba(0,255,102,0.08)",
    accent: "#00FF66", accentBg: "rgba(0,255,102,0.05)",
    headerBg: "#0A0A0A", headerText: "#00FF66",
    eventHover: "rgba(0,255,102,0.06)",
    calDayBg: "rgba(0,255,102,0.03)", calTodayBg: "rgba(0,255,102,0.12)",
    weekendBg: "rgba(0,255,102,0.05)",
    modalBg: "#0F0F0F", modalText: "#00FF66",
    font: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    fontDisplay: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    titleSize: "20px", titleWeight: "700",
    titleTransform: "uppercase", titleLetterSpacing: "0.10em",
    dayHeaderSize: "13px", dayHeaderWeight: "700",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.10em",
    todayHeaderSize: "18px",
    eventSummarySize: "13px", eventSummaryWeight: "500",
    eventTimeSize: "12px",
    radius: "0", radiusSm: "0", radiusXs: "0",
    cardShadow: "0 0 0 1px rgba(0,255,102,0.30)",
    density: "compact",
    eventTextStrong: "#00FF66", eventTextSoft: "#4A8060",
    customCss: `
      .event-summary::before { content: "> "; color: var(--accent); opacity: 0.6; }
      .day-header::before { content: "[ "; }
      .day-header::after { content: " ]"; opacity: 0.5; margin-left: 4px; }
      .header .title::before { content: "$ "; opacity: 0.5; }
    `,
  },
  paper: {
    // Notebook style: warm cream, hand-feel font, ruled-line dividers, subtle
    // shadow. Generous spacing makes it feel like a physical planner.
    name: "Paper",
    cardBg: "#FFFCF5", text: "#2A2418", muted: "#8A7E68",
    border: "rgba(60,40,20,0.12)", todayBg: "rgba(180,120,60,0.08)",
    accent: "#A0522D", accentBg: "rgba(160,82,45,0.04)",
    headerBg: "#FFFCF5", headerText: "#2A2418",
    eventHover: "rgba(160,82,45,0.04)",
    calDayBg: "#FBF6E8", calTodayBg: "rgba(160,82,45,0.10)",
    weekendBg: "rgba(220,180,100,0.08)",
    modalBg: "#FFFCF5", modalText: "#2A2418",
    font: "'Caveat', 'Bradley Hand', 'Brush Script MT', cursive",
    fontDisplay: "'Caveat', 'Bradley Hand', 'Brush Script MT', cursive",
    titleSize: "32px", titleWeight: "700", titleLetterSpacing: "0",
    dayHeaderSize: "20px", dayHeaderWeight: "700",
    todayHeaderSize: "26px",
    eventSummarySize: "18px", eventSummaryWeight: "500",
    eventTimeSize: "16px",
    radius: "4px", radiusSm: "3px", radiusXs: "2px",
    cardShadow: "0 4px 12px rgba(60,40,20,0.10)",
    density: "spacious",
    eventTextStrong: "#2A2418", eventTextSoft: "#8A7E68",
  },
  botanical: {
    // Sage green serif, ivory paper, organic & calming.
    name: "Botanical",
    cardBg: "#F0EDE4", text: "#2D3B2D", muted: "#6B7B6B",
    border: "rgba(74,124,89,0.16)", todayBg: "rgba(74,124,89,0.10)",
    accent: "#4A7C59", accentBg: "rgba(74,124,89,0.06)",
    headerBg: "#F0EDE4", headerText: "#2D3B2D",
    eventHover: "rgba(74,124,89,0.05)",
    calDayBg: "#FAFAF5", calTodayBg: "rgba(74,124,89,0.14)",
    weekendBg: "rgba(166,123,91,0.10)",
    modalBg: "#FAFAF5", modalText: "#2D3B2D",
    font: "Georgia, 'Times New Roman', serif",
    fontDisplay: "Georgia, 'Times New Roman', serif",
    titleSize: "30px", titleWeight: "400", titleLetterSpacing: "0.005em",
    dayHeaderSize: "15px", dayHeaderWeight: "600",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.10em",
    radius: "10px", radiusSm: "6px", radiusXs: "4px",
    cardShadow: "0 4px 16px rgba(45,59,45,0.06), 0 1px 3px rgba(45,59,45,0.06)",
    density: "spacious",
    eventTextStrong: "#2D3B2D", eventTextSoft: "#6B7B6B",
  },
  newsprint: {
    // Old broadsheet: aged paper, ink-black slab serif, ALL-CAPS rules.
    name: "Newsprint",
    cardBg: "#EFEAD8", text: "#1A1A1A", muted: "#5A5650",
    border: "rgba(0,0,0,0.30)", todayBg: "rgba(0,0,0,0.06)",
    accent: "#1A1A1A", accentBg: "rgba(0,0,0,0.04)",
    headerBg: "#EFEAD8", headerText: "#0A0A0A",
    eventHover: "rgba(0,0,0,0.04)",
    calDayBg: "#F5F1E0", calTodayBg: "rgba(0,0,0,0.10)",
    weekendBg: "rgba(0,0,0,0.05)",
    modalBg: "#EFEAD8", modalText: "#1A1A1A",
    font: "'Iowan Old Style', 'Palatino', 'Times New Roman', serif",
    fontDisplay: "'UnifrakturCook', 'Old English Text MT', 'Iowan Old Style', serif",
    titleSize: "38px", titleWeight: "700", titleLetterSpacing: "0.005em",
    dayHeaderSize: "12px", dayHeaderWeight: "700",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.20em",
    todayHeaderSize: "20px",
    eventSummarySize: "15px", eventSummaryWeight: "500",
    radius: "0", radiusSm: "0", radiusXs: "0",
    cardShadow: "none",
    density: "compact",
    eventTextStrong: "#0A0A0A", eventTextSoft: "#5A5650",
    customCss: `
      .day-header { border-top: 2px solid var(--text-strong); border-bottom: 1px solid var(--text-strong); }
      .header { border-bottom: 4px double var(--text-strong); }
      .event { border-bottom: 1px solid rgba(0,0,0,0.15) !important; }
    `,
  },
  bauhaus: {
    // Geometric primaries: black + red + yellow on bone white, hard angles.
    name: "Bauhaus",
    cardBg: "#F4F1EB", text: "#0A0A0A", muted: "#5A5A5A",
    border: "#0A0A0A", todayBg: "rgba(218,41,28,0.08)",
    accent: "#DA291C", accentBg: "rgba(218,41,28,0.06)",
    headerBg: "#F4F1EB", headerText: "#0A0A0A",
    eventHover: "rgba(0,0,0,0.04)",
    calDayBg: "#FFFFFF", calTodayBg: "rgba(255,210,0,0.18)",
    weekendBg: "rgba(31,78,160,0.06)",
    modalBg: "#FFFFFF", modalText: "#0A0A0A",
    font: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontDisplay: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    titleSize: "30px", titleWeight: "900", titleLetterSpacing: "-0.02em",
    titleTransform: "uppercase",
    dayHeaderSize: "14px", dayHeaderWeight: "900",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.05em",
    eventSummarySize: "15px", eventSummaryWeight: "600",
    radius: "0", radiusSm: "0", radiusXs: "0",
    cardShadow: "8px 8px 0 #0A0A0A",
    density: "regular",
    eventTextStrong: "#0A0A0A", eventTextSoft: "#5A5A5A",
    customCss: `
      .header { border-bottom: 3px solid #0A0A0A; }
      .header .badge { background: #FFD200; color: #0A0A0A; border: 2px solid #0A0A0A; border-radius: 0; }
      .day.is-today { border: 3px solid #DA291C; padding: 8px; background: rgba(255,210,0,0.10); }
    `,
  },
  pastel: {
    // Soft watercolor purples & pinks, friendly rounded.
    name: "Pastel",
    cardBg: "#FAF6FF", text: "#3A2A4A", muted: "#8A7AA8",
    border: "rgba(150,120,200,0.15)", todayBg: "rgba(180,150,230,0.12)",
    accent: "#9B7FBF", accentBg: "rgba(155,127,191,0.06)",
    headerBg: "#FAF6FF", headerText: "#3A2A4A",
    eventHover: "rgba(155,127,191,0.05)",
    calDayBg: "#F2EBFA", calTodayBg: "rgba(155,127,191,0.16)",
    weekendBg: "rgba(255,180,210,0.14)",
    modalBg: "#FAF6FF", modalText: "#3A2A4A",
    font: "'Quicksand', 'Avenir Next', 'Avenir', sans-serif",
    fontDisplay: "'Quicksand', 'Avenir Next', 'Avenir', sans-serif",
    titleSize: "26px", titleWeight: "500", titleLetterSpacing: "0.01em",
    dayHeaderSize: "15px", dayHeaderWeight: "600",
    eventSummaryWeight: "500",
    radius: "22px", radiusSm: "14px", radiusXs: "8px",
    cardShadow: "0 8px 24px rgba(155,127,191,0.10)",
    density: "spacious",
    eventTextStrong: "#3A2A4A", eventTextSoft: "#8A7AA8",
  },
  neon: {
    // Synthwave: deep purple-black, hot pink + cyan accents, glow.
    name: "Neon",
    cardBg: "#0F0820", text: "#F0E8FF", muted: "#7A6AA0",
    border: "rgba(255,80,200,0.20)", todayBg: "rgba(255,80,200,0.10)",
    accent: "#FF50C8", accentBg: "rgba(255,80,200,0.08)",
    headerBg: "#0F0820", headerText: "#FFEEFF",
    eventHover: "rgba(0,255,255,0.06)",
    calDayBg: "rgba(120,80,200,0.06)", calTodayBg: "rgba(255,80,200,0.14)",
    weekendBg: "rgba(0,200,255,0.06)",
    modalBg: "#1A0F30", modalText: "#F0E8FF",
    font: "'Orbitron', 'Rajdhani', 'Helvetica Neue', sans-serif",
    fontDisplay: "'Orbitron', 'Rajdhani', 'Helvetica Neue', sans-serif",
    titleSize: "24px", titleWeight: "700",
    titleTransform: "uppercase", titleLetterSpacing: "0.18em",
    dayHeaderSize: "13px", dayHeaderWeight: "700",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.20em",
    todayHeaderSize: "20px",
    eventSummarySize: "15px", eventSummaryWeight: "500",
    radius: "2px", radiusSm: "2px", radiusXs: "1px",
    cardShadow: "0 0 30px rgba(255,80,200,0.20), 0 0 60px rgba(0,200,255,0.10)",
    density: "regular",
    eventTextStrong: "#FFEEFF", eventTextSoft: "#B0A0D0",
    customCss: `
      .header .title { text-shadow: 0 0 12px rgba(255,80,200,0.50), 0 0 24px rgba(255,80,200,0.25); }
      .day.is-today .day-header { color: #00E5FF; text-shadow: 0 0 8px rgba(0,229,255,0.40); }
      .accent, .modal-title, .recheck-btn { text-shadow: 0 0 6px rgba(255,80,200,0.30); }
    `,
  },
  kraft: {
    // Vintage kraft paper, slab serif, rustic warm browns.
    name: "Kraft",
    cardBg: "#C9A878", text: "#2E1A0A", muted: "#6B4A2A",
    border: "rgba(46,26,10,0.20)", todayBg: "rgba(46,26,10,0.10)",
    accent: "#8B3A1F", accentBg: "rgba(139,58,31,0.08)",
    headerBg: "#C9A878", headerText: "#2E1A0A",
    eventHover: "rgba(46,26,10,0.06)",
    calDayBg: "rgba(255,245,220,0.45)", calTodayBg: "rgba(139,58,31,0.14)",
    weekendBg: "rgba(180,90,40,0.12)",
    modalBg: "#E8D2A8", modalText: "#2E1A0A",
    font: "'Rockwell', 'Roboto Slab', 'Courier New', serif",
    fontDisplay: "'Rockwell', 'Roboto Slab', 'Courier New', serif",
    titleSize: "30px", titleWeight: "700", titleLetterSpacing: "-0.005em",
    dayHeaderSize: "14px", dayHeaderWeight: "700",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.12em",
    eventSummaryWeight: "500",
    radius: "2px", radiusSm: "2px", radiusXs: "1px",
    cardShadow: "0 2px 8px rgba(46,26,10,0.20)",
    density: "regular",
    eventTextStrong: "#2E1A0A", eventTextSoft: "#6B4A2A",
  },
  nordic: {
    // Ultra-clean blue-grey, restrained sans, generous whitespace.
    name: "Nordic",
    cardBg: "#F8F9FB", text: "#1E2328", muted: "#8B919A",
    border: "rgba(0,0,0,0.06)", todayBg: "rgba(59,107,155,0.05)",
    accent: "#3B6B9B", accentBg: "rgba(59,107,155,0.04)",
    headerBg: "#F8F9FB", headerText: "#1E2328",
    eventHover: "rgba(59,107,155,0.04)",
    calDayBg: "#FFFFFF", calTodayBg: "rgba(59,107,155,0.10)",
    weekendBg: "rgba(196,155,106,0.06)",
    modalBg: "#FFFFFF", modalText: "#1E2328",
    font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
    fontDisplay: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
    titleSize: "24px", titleWeight: "300", titleLetterSpacing: "-0.01em",
    dayHeaderSize: "13px", dayHeaderWeight: "500",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.14em",
    eventSummarySize: "15px", eventSummaryWeight: "400",
    radius: "8px", radiusSm: "4px", radiusXs: "3px",
    cardShadow: "0 1px 3px rgba(0,0,0,0.04)",
    density: "spacious",
    eventTextStrong: "#1E2328", eventTextSoft: "#8B919A",
  },
  espresso: {
    // Deep coffee browns + cream, warm cafe ambience.
    name: "Espresso",
    cardBg: "#1F1410", text: "#E8DCC4", muted: "#9A8568",
    border: "rgba(232,220,196,0.10)", todayBg: "rgba(218,165,32,0.10)",
    accent: "#DAA520", accentBg: "rgba(218,165,32,0.06)",
    headerBg: "#1F1410", headerText: "#F5E8C8",
    eventHover: "rgba(218,165,32,0.05)",
    calDayBg: "rgba(232,220,196,0.04)", calTodayBg: "rgba(218,165,32,0.14)",
    weekendBg: "rgba(160,82,45,0.10)",
    modalBg: "#2C1F18", modalText: "#E8DCC4",
    font: "'Lora', Georgia, serif",
    fontDisplay: "'Lora', Georgia, serif",
    titleSize: "28px", titleWeight: "500", titleLetterSpacing: "0.005em",
    dayHeaderSize: "14px", dayHeaderWeight: "600",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.12em",
    eventSummaryWeight: "400",
    radius: "12px", radiusSm: "8px", radiusXs: "4px",
    cardShadow: "0 6px 20px rgba(0,0,0,0.30)",
    density: "regular",
    eventTextStrong: "#F5E8C8", eventTextSoft: "#9A8568",
  },
  slate: {
    // Modern corporate slate grey + cool teal.
    name: "Slate",
    cardBg: "#1C2228", text: "#D8DEE6", muted: "#7A8290",
    border: "rgba(255,255,255,0.06)", todayBg: "rgba(80,180,180,0.08)",
    accent: "#5EBFB7", accentBg: "rgba(94,191,183,0.05)",
    headerBg: "#1C2228", headerText: "#FFFFFF",
    eventHover: "rgba(94,191,183,0.04)",
    calDayBg: "rgba(255,255,255,0.02)", calTodayBg: "rgba(94,191,183,0.10)",
    weekendBg: "rgba(255,255,255,0.03)",
    modalBg: "#262E36", modalText: "#D8DEE6",
    font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontDisplay: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    titleSize: "22px", titleWeight: "600", titleLetterSpacing: "-0.015em",
    dayHeaderSize: "12px", dayHeaderWeight: "600",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.10em",
    eventSummarySize: "14px", eventSummaryWeight: "500",
    radius: "10px", radiusSm: "6px", radiusXs: "4px",
    cardShadow: "0 4px 16px rgba(0,0,0,0.20)",
    density: "compact",
    eventTextStrong: "#FFFFFF", eventTextSoft: "#A8B0BC",
  },
  cyber: {
    // Futuristic deep navy + electric cyan, mono accents, sharp.
    name: "Cyber",
    cardBg: "#040814", text: "#A8E6F8", muted: "#5A8AB0",
    border: "rgba(0,229,255,0.14)", todayBg: "rgba(0,229,255,0.10)",
    accent: "#00E5FF", accentBg: "rgba(0,229,255,0.06)",
    headerBg: "#040814", headerText: "#E0FAFF",
    eventHover: "rgba(0,229,255,0.05)",
    calDayBg: "rgba(0,229,255,0.03)", calTodayBg: "rgba(0,229,255,0.14)",
    weekendBg: "rgba(120,80,200,0.06)",
    modalBg: "#0A1428", modalText: "#A8E6F8",
    font: "'Rajdhani', 'Helvetica Neue', sans-serif",
    fontDisplay: "ui-monospace, 'SF Mono', Menlo, monospace",
    titleSize: "22px", titleWeight: "700",
    titleTransform: "uppercase", titleLetterSpacing: "0.16em",
    dayHeaderSize: "12px", dayHeaderWeight: "600",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.16em",
    eventSummarySize: "14px", eventSummaryWeight: "500",
    eventTimeSize: "13px",
    radius: "0", radiusSm: "0", radiusXs: "0",
    cardShadow: "0 0 0 1px rgba(0,229,255,0.20), 0 8px 32px rgba(0,229,255,0.08)",
    density: "compact",
    eventTextStrong: "#E0FAFF", eventTextSoft: "#7AB8D0",
    customCss: `
      .header { border-bottom: 1px solid rgba(0,229,255,0.30); }
      .day.is-today { box-shadow: inset 4px 0 0 var(--accent); }
      .event-time { letter-spacing: 0.05em; }
    `,
  },
  candy: {
    // Playful pinks, mint, lemon — cheerful & high-energy.
    name: "Candy",
    cardBg: "#FFF8F0", text: "#3A1F3A", muted: "#9A6A8A",
    border: "rgba(220,80,150,0.18)", todayBg: "rgba(220,80,150,0.10)",
    accent: "#E04080", accentBg: "rgba(224,64,128,0.06)",
    headerBg: "#FFF8F0", headerText: "#3A1F3A",
    eventHover: "rgba(224,64,128,0.05)",
    calDayBg: "#FFEEF4", calTodayBg: "rgba(224,64,128,0.14)",
    weekendBg: "rgba(120,220,180,0.14)",
    modalBg: "#FFF8F0", modalText: "#3A1F3A",
    font: "'Poppins', 'Quicksand', sans-serif",
    fontDisplay: "'Poppins', 'Quicksand', sans-serif",
    titleSize: "28px", titleWeight: "700", titleLetterSpacing: "-0.01em",
    dayHeaderSize: "14px", dayHeaderWeight: "700",
    eventSummaryWeight: "500",
    radius: "20px", radiusSm: "14px", radiusXs: "8px",
    cardShadow: "0 10px 30px rgba(224,64,128,0.10), 0 2px 6px rgba(224,64,128,0.06)",
    density: "regular",
    eventTextStrong: "#3A1F3A", eventTextSoft: "#9A6A8A",
  },
  obsidian: {
    // Pure black + razor-thin white rules, ultra-minimal high-end.
    name: "Obsidian",
    cardBg: "#000000", text: "#E8E8E8", muted: "#7A7A7A",
    border: "rgba(255,255,255,0.10)", todayBg: "rgba(255,255,255,0.05)",
    accent: "#FFFFFF", accentBg: "rgba(255,255,255,0.03)",
    headerBg: "#000000", headerText: "#FFFFFF",
    eventHover: "rgba(255,255,255,0.04)",
    calDayBg: "rgba(255,255,255,0.02)", calTodayBg: "rgba(255,255,255,0.08)",
    weekendBg: "rgba(255,255,255,0.03)",
    modalBg: "#0A0A0A", modalText: "#E8E8E8",
    font: "'Inter', -apple-system, sans-serif",
    fontDisplay: "'Playfair Display', Georgia, serif",
    titleSize: "32px", titleWeight: "400", titleLetterSpacing: "-0.02em",
    dayHeaderSize: "11px", dayHeaderWeight: "400",
    dayHeaderTransform: "uppercase", dayHeaderLetterSpacing: "0.30em",
    eventSummarySize: "15px", eventSummaryWeight: "300",
    radius: "0", radiusSm: "0", radiusXs: "0",
    cardShadow: "none",
    density: "spacious",
    eventTextStrong: "#FFFFFF", eventTextSoft: "#A0A0A0",
    customCss: `
      .header { border-bottom: 1px solid rgba(255,255,255,0.20); }
      .day-header { border-bottom-color: rgba(255,255,255,0.10) !important; }
    `,
  },
};

const PERSON_COLORS = {
  katja: "#FF6B6B", ken: "#4ECDC4", caleb: "#45B7D1",
  sam: "#96CEB4", shared: "#FFEAA7",
};

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT_MON = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

class KatjaScheduleCard extends HTMLElement {
  connectedCallback() {
    // Minute-ticker for the Day View NOW line. HA re-renders the card
    // on every entity state change, but the wall display can go a
    // full minute without one — so the red NOW rule would otherwise
    // stay locked to whatever position it had at the last hass()
    // update. Re-render every minute when the active view is dayview
    // (or the card is locked to dayview) so the line creeps.
    if (this._nowTickerId) return;
    this._nowTickerId = setInterval(() => {
      if (this._view === "dayview"
          || this._lockedView === "dayview"
          || this._lockedView === "dayview-today") {
        this._render();
      }
    }, 60_000);
  }
  disconnectedCallback() {
    if (this._nowTickerId) { clearInterval(this._nowTickerId); this._nowTickerId = null; }
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._events = [];
    this._pendingProposals = [];
    this._lastFetch = 0;
    this._fetchInterval = 5 * 60 * 1000;
    this._view = "overview";
    this._detailEvent = null;
    this._recheckResult = null;
    this._recheckLoading = false;
    this._actionLoading = false;
    this._actionResult = null;
    this._originPickerMode = false;
    this._dayDetailDate = null;
    this._theme = "dark";
    this._showFlagged = false;
    // fr-2026-05-11-a: per-day override of the global show-flagged
    // state. Keyed by day-iso ("YYYY-MM-DD"). When global is OFF, a
    // day in this set still surfaces its flagged events. When global
    // toggles ON, the set is cleared (global already shows
    // everything; per-day chips would look orphaned).
    this._perDayFlagged = new Set();
    // fr-2026-05-11-b: review modal state. Opens on pending-pill tap;
    // mirrors the web /review page (calendar NEW/CHANGED rows folded
    // with agent proposals + recurring-batches banner). Each Accept/
    // Reject/Apply button calls a katja_schedule/* WS command that
    // forwards to a bearer twin of the corresponding /events/* or
    // /review/proposed/* route (server-side logic is unchanged so
    // both surfaces share the same outcome).
    this._reviewOpen = false;
    this._reviewInbox = null;
    this._reviewLoading = false;
    this._reviewActionPending = new Set();
    this._reviewActionError = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (Date.now() - this._lastFetch > this._fetchInterval) this._fetchEvents();
  }

  setConfig(config) {
    if (!config.calendars || !config.calendars.length) throw new Error("Define at least one calendar entity.");
    this._config = { title: "Family Schedule", ...config };
    // Theme
    const themeName = (config.theme || "dark").toLowerCase();
    this._theme = THEMES[themeName] ? themeName : "dark";
    this._showThemeToggle = !!config.show_theme_toggle;
    // view config locks the card to a single view: today, tomorrow, calendar, schedule, overview
    const locked = (config.view || "").toLowerCase();
    if (locked && ["today", "tomorrow", "calendar", "schedule", "overview", "dayview", "dayview-today"].includes(locked)) {
      this._lockedView = locked;
      this._view = locked === "today" || locked === "tomorrow" ? "schedule" : locked;
    } else {
      this._lockedView = null;
    }
    // seam: where adjacent cards abut. Flattens border-radius on those edges
    // and drops the shadow so siblings inside a horizontal-stack /
    // vertical-stack visually butt together. Accepts a string ("right"),
    // CSV ("right,bottom"), or array (["right","bottom"]).
    const seamRaw = config.seam || "";
    const seamList = Array.isArray(seamRaw) ? seamRaw : String(seamRaw).split(/[,\s]+/);
    this._seam = new Set(
      seamList.map(s => String(s).trim().toLowerCase())
              .filter(s => ["left","right","top","bottom"].includes(s))
    );
    // Per-panel themes (overview view only). Each region — today, tomorrow,
    // calendar — can override the card's theme. Unset panels inherit `theme`.
    const pt = config.panel_themes || {};
    this._panelThemes = {
      today:    THEMES[(pt.today    || "").toLowerCase()] ? pt.today.toLowerCase()    : null,
      tomorrow: THEMES[(pt.tomorrow || "").toLowerCase()] ? pt.tomorrow.toLowerCase() : null,
      calendar: THEMES[(pt.calendar || "").toLowerCase()] ? pt.calendar.toLowerCase() : null,
    };
    this._render();
  }

  getCardSize() {
    const v = this._lockedView;
    if (v === "today" || v === "tomorrow") return 6;
    if (v === "calendar") return 8;
    return 12;
  }

  getLayoutOptions() {
    return { grid_rows: "auto", grid_min_rows: 2, grid_columns: "full", grid_min_columns: 2 };
  }

  static getConfigElement() { return document.createElement("katja-schedule-card-editor"); }

  static getStubConfig() {
    return {
      title: "Family Schedule",
      theme: "dark",
      view: "",
      show_theme_toggle: false,
      calendars: [],
      sensors: { pending: "", sync: "" },
    };
  }

  // ====================== DATA ======================

  /** Build an ISO timestamp anchored at Pacific midnight on the given
   *  Y/M/D — independent of the browser's local timezone. Without this,
   *  loading the dashboard from a non-Pacific browser shifts the fetch
   *  range by the local UTC offset and we miss late-night events near
   *  midnight Pacific (or pull in extra previous-day events). */
  _pacificISOAtMidnight(year, month, day) {
    // Look up Pacific's UTC offset on that date (PST/PDT swap).
    const probe = new Date(Date.UTC(year, month, day, 12));
    const tz = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", timeZoneName: "shortOffset",
    }).formatToParts(probe).find(p => p.type === "timeZoneName")?.value || "GMT-08:00";
    // tz looks like "GMT-7" or "GMT-8"; normalize to "-07:00" / "-08:00".
    const m = tz.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    const sign = m?.[1] || "-";
    const hh = String(m?.[2] || "8").padStart(2, "0");
    const mm = (m?.[3] || "00").padStart(2, "0");
    const yyyy = String(year).padStart(4, "0");
    const mo = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mo}-${dd}T00:00:00${sign}${hh}:${mm}`;
  }

  async _fetchEvents() {
    if (!this._hass || !this._config.calendars) return;
    this._lastFetch = Date.now();
    const now = this._pacificNow();
    // Pacific-anchored range — see _pacificISOAtMidnight.
    const startISO = this._pacificISOAtMidnight(now.getFullYear(), now.getMonth(), now.getDate());
    const endProbe = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 35);
    const endISO = this._pacificISOAtMidnight(endProbe.getFullYear(), endProbe.getMonth(), endProbe.getDate());
    const all = [];
    for (const cal of this._config.calendars) {
      try {
        const events = await this._hass.callApi("GET",
          `calendars/${encodeURIComponent(cal.entity)}?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`);
        for (const ev of events || []) {
          // Integration v0.12+ encodes Who/Status as `Key: value` lines in
          // description. Parse those out so the card can color-by-person and
          // toggle-by-status without needing 5 entities.
          const meta = this._parseEventMeta(ev.description || "");
          const who = (meta.who || cal.label || "").toLowerCase();
          const colorKey = who.split(",")[0]?.trim();
          all.push({
            ...ev,
            _color: cal.color || PERSON_COLORS[colorKey] || PERSON_COLORS[cal.label?.toLowerCase()] || "#888",
            _label: meta.who || cal.label || cal.entity.split("_").pop(),
            _status: meta.status || "",
            _eventId: meta.eventid || "",
          });
        }
      } catch (e) { console.warn(`Failed to fetch from ${cal.entity}:`, e); }
    }
    const seen = new Set(), deduped = [];
    for (const ev of all) {
      const key = `${ev.summary||""}|${ev.start?.dateTime||ev.start?.date||""}`;
      if (!seen.has(key)) { seen.add(key); deduped.push(ev); }
    }
    this._events = deduped;
    // Pull pending proposals in parallel so the schedule + REVIEW
    // badges land in the same render pass. Best-effort: a failure
    // here just means no badges this cycle, never blocks the fetch.
    this._fetchPendingProposals();
    this._render();
  }

  async _fetchPendingProposals() {
    if (!this._hass) return;
    try {
      const r = await this._hass.callWS({
        type: "katja_schedule/list_pending_proposals",
      });
      this._pendingProposals = (r && r.proposals) || [];
    } catch (e) {
      // The integration may be older (no ws command yet) or unconfigured;
      // either way, proceed without badges rather than break the card.
      this._pendingProposals = [];
    }
    this._render();
  }

  /** Match a card-rendered event against the pending-proposal queue and
   *  return {kind, id} when a proposal targets it, or null. Mirrors the
   *  matching that renderer.merge_pending_proposals does on the web —
   *  update/hide/accept/merge match by event_id (parsed from the
   *  EventId: line in the calendar description); remove matches by
   *  date + criteria; add proposals are surfaced as ghost rows
   *  (handled separately during grouping, not here). */
  _matchPendingProposal(ev) {
    const proposals = this._pendingProposals || [];
    if (!proposals.length) return null;
    const evId = ev._eventId || "";
    const dateStr = (ev.start?.dateTime || ev.start?.date || "").slice(0, 10);
    const summary = (ev.summary || "").toLowerCase();
    const who = (ev._label || "").toLowerCase();
    for (const p of proposals) {
      const k = p.kind, args = p.args || {};
      if (k === "update" || k === "hide" || k === "accept" || k === "merge") {
        if (evId && (args.event_id || "") === evId) return {kind: k, id: p.id};
      } else if (k === "remove") {
        if (args.date && dateStr !== args.date) continue;
        const wc = (args.what_contains || "").toLowerCase();
        const ws = (args.what_starts_with || "").toLowerCase();
        const wh = (args.who || "").toLowerCase();
        if (wc && !summary.includes(wc)) continue;
        if (ws && !summary.startsWith(ws)) continue;
        if (wh && wh !== who) continue;
        if (!wc && !ws && !wh && !args.date) continue; // tool guard requires ≥1
        return {kind: "remove", id: p.id};
      }
    }
    return null;
  }

  /** Synthesize ghost calendar events for pending `add` proposals so
   *  the card shows what acceptance would create. Returns a list of
   *  events shaped like the HA calendar API responses (start/end/
   *  summary) plus the same _color/_label/_status/_eventId metadata
   *  this._events carries, plus a _pendingProposal marker the
   *  renderer reads to apply REVIEW styling.
   *  fr-2026-05-07-d. */
  _ghostEventsForPendingAdds() {
    const out = [];
    for (const p of this._pendingProposals || []) {
      if (p.kind !== "add") continue;
      const args = p.args || {};
      if (!args.date) continue;
      const who = (args.who || "").toLowerCase().split(",")[0]?.trim() || "";
      const [y, m, d] = args.date.split("-").map(Number);
      const t24 = this._timeTo24h(args.time || "") || "00:00:00";
      const midnightISO = this._pacificISOAtMidnight(y, m - 1, d);
      // _pacificISOAtMidnight returns "...T00:00:00±HH:MM"; swap the
      // midnight clock for the proposal's actual time.
      const startISO = midnightISO.replace("T00:00:00", `T${t24}`);
      out.push({
        summary: args.what || "(unnamed)",
        start: {dateTime: startISO},
        end: {dateTime: ""},
        description: `Where: ${args.where || ""}\nWho: ${args.who || ""}`,
        _color: PERSON_COLORS[who] || "#888",
        _label: args.who || "",
        _status: "",
        _eventId: "",
        _pendingProposal: {kind: "add", id: p.id},
      });
    }
    return out;
  }

  /** Convert "9:00 AM" / "14:30" / "" to "HH:MM:SS" for the ghost
   *  start.dateTime construction. Returns "" if unparseable. */
  _timeTo24h(s) {
    if (!s) return "";
    const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!m) return "";
    let h = parseInt(m[1]);
    const min = m[2];
    const ampm = (m[3] || "").toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}:00`;
  }

  _parseEventMeta(description) {
    const out = {};
    if (!description) return out;
    for (const line of description.split(/\r?\n/)) {
      const m = line.match(/^\s*(\w+)\s*:\s*(.+)\s*$/);
      if (!m) continue;
      const k = m[1].toLowerCase();
      if (k === "who" || k === "status" || k === "where" || k === "flight" || k === "source" || k === "eventid") {
        out[k] = m[2].trim();
      }
    }
    return out;
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

  // Extract the {h, m, ampm} of an ISO timestamp as seen in Pacific
  // time, not the viewer's local time. Without this, an HA dashboard
  // viewed from a non-Pacific timezone displays event times in the
  // viewer's TZ — e.g. a 10:00 AM Pacific event reads as 1:00 PM on
  // an Eastern-time client. The schedule's audience is always LA.
  _pacificTimeParts(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric", minute: "2-digit", hour12: true,
    }).formatToParts(d);
    const get = (t) => (parts.find(p => p.type === t) || {}).value || "";
    return {
      h: parseInt(get("hour"), 10),
      m: parseInt(get("minute"), 10),
      ampm: get("dayPeriod"),
    };
  }

  _formatTime(ev) {
    const start = this._pacificTimeParts(ev.start?.dateTime);
    if (!start) return "All day";
    const sMin = start.m < 10 ? `0${start.m}` : start.m;
    const end = this._pacificTimeParts(ev.end?.dateTime);
    if (!end) return `${start.h}:${sMin} ${start.ampm}`;
    const eMin = end.m < 10 ? `0${end.m}` : end.m;
    return start.ampm === end.ampm
      ? `${start.h}:${sMin}–${end.h}:${eMin} ${end.ampm}`
      : `${start.h}:${sMin} ${start.ampm}–${end.h}:${eMin} ${end.ampm}`;
  }

  _formatTimeShort(ev) {
    const start = this._pacificTimeParts(ev.start?.dateTime);
    if (!start) return "";
    const ap = start.ampm === "PM" ? "p" : "a";
    return start.m === 0
      ? `${start.h}${ap}`
      : `${start.h}:${start.m < 10 ? `0${start.m}` : start.m}${ap}`;
  }

  _isDrive(s) { return s && s.toLowerCase().includes("drive"); }
  _isFlight(s) { return s && (s.includes("✈") || s.toLowerCase().includes("flight") || s.toLowerCase().includes("lands")); }

  // Mirror of templates/schedule.html's `_LA_AIRPORTS` so the wall
  // display picks the same address the web app does. Drive-from-home
  // makes sense for any Brentwood-adjacent airport in this set; the
  // user picks home or work and the card routes home→airport
  // (outbound) or airport→home (inbound) per the flight pair.
  static _LA_AIRPORT_ADDRESSES = {
    LAX: "1 World Way, Los Angeles, CA 90045",
    BUR: "2627 N Hollywood Way, Burbank, CA 91505",
    LGB: "4100 Donald Douglas Dr, Long Beach, CA 90808",
    SNA: "18601 Airport Way, Santa Ana, CA 92707",
    ONT: "2900 E Airport Dr, Ontario, CA 91761",
  };

  // Returns {address, iata, direction} for a flight calendar event,
  // or null if the description doesn't carry a `Flight: <num> A→B`
  // line. Direction is "outbound" when origin is LA-area, "inbound"
  // when destination is LA-area; foreign-to-foreign legs fall back
  // to outbound semantics with the origin IATA.
  _flightAirportInfo(ev) {
    const desc = ev?.description || "";
    const m = desc.match(/Flight:\s*\S+\s+([A-Z]{3})\s*→\s*([A-Z]{3})/);
    if (!m) return null;
    const origin = m[1].toUpperCase(), destination = m[2].toUpperCase();
    const map = this.constructor._LA_AIRPORT_ADDRESSES;
    if (map[origin]) {
      return { address: map[origin], iata: origin, direction: "outbound" };
    }
    if (map[destination]) {
      return { address: map[destination], iata: destination, direction: "inbound" };
    }
    return { address: origin, iata: origin, direction: "outbound" };
  }
  _isFlaggedText(s) { return s && (s.toUpperCase().includes("CANCELLED") || s.toUpperCase().includes("SKIPPED")); }
  _isHiddenStatus(status) { return status === "hidden_rule" || status === "hidden_oneoff"; }
  _isFlagged(ev) {
    // Accept either an event object or a summary string for back-compat.
    if (typeof ev === "string") return this._isFlaggedText(ev);
    if (!ev) return false;
    return this._isFlaggedText(ev.summary || "") || this._isHiddenStatus(ev._status);
  }
  _flaggedLabel(ev) {
    if (!ev) return "";
    if (ev._status === "hidden_rule") return "Hidden by rule";
    if (ev._status === "hidden_oneoff") return "Hidden";
    const s = (ev.summary || "").toUpperCase();
    if (s.includes("CANCELLED")) return "Cancelled";
    if (s.includes("SKIPPED")) return "Skipped";
    return "";
  }
  _toggleFlagged() {
    this._showFlagged = !this._showFlagged;
    // fr-2026-05-11-a: clear per-day overrides when global flips ON —
    // the global rule already shows everything, so per-day chips would
    // be orphaned and their state would be confusing on next OFF.
    if (this._showFlagged) this._perDayFlagged.clear();
    console.info("KATJA: toggled flagged to", this._showFlagged);
    this._render();
  }
  _toggleDayFlagged(ds) {
    if (this._perDayFlagged.has(ds)) this._perDayFlagged.delete(ds);
    else this._perDayFlagged.add(ds);
    this._render();
  }
  _dayShowsFlagged(ds) {
    return this._showFlagged || this._perDayFlagged.has(ds);
  }
  /** Count flagged (cancelled / skipped / rule-hidden) events on a
   *  single day's event list. Drives the per-day 🗑 chip label
   *  ("🗑 3") and the hide-when-zero rule so days with nothing to
   *  reveal don't carry a chrome chip. fr-2026-05-11-b. */
  _flaggedCountForDay(events) {
    return (events || []).filter(ev => this._isFlagged(ev)).length;
  }
  /** Count flagged events across an arbitrary set of day-ISO strings.
   *  Used for the Calendar-view global 🗑 label so the user knows
   *  how many cancelled/skipped rows the grid currently hides. */
  _flaggedCountAcrossDays(grouped, days) {
    let n = 0;
    for (const ds of (days || [])) n += this._flaggedCountForDay(grouped[ds] || []);
    return n;
  }
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
    let buildInfo = "";
    if (this._hass && this._config.sensors?.sync) {
      const s = this._hass.states[this._config.sensors.sync];
      if (s?.attributes) {
        const sha = s.attributes.build_sha || "";
        const bt = s.attributes.build_time || "";
        if (sha) {
          buildInfo = sha;
          if (bt) {
            try { buildInfo += ` · ${new Date(bt).toLocaleDateString("en-US", {month:"short", day:"numeric"})}`; } catch(_) {}
          }
        }
      }
    }
    return { pendingCount, syncText, buildInfo };
  }

  _switchView(v) { this._view = v; this._detailEvent = null; this._dayDetailDate = null; this._render(); }
  _cycleTheme() {
    const keys = Object.keys(THEMES);
    const idx = keys.indexOf(this._theme);
    this._theme = keys[(idx + 1) % keys.length];
    this._render();
  }
  _openDetail(ev) { this._detailEvent = ev; this._recheckResult = null; this._recheckLoading = false; this._actionResult = null; this._actionLoading = false; this._originPickerMode = false; this._render(); }
  _closeDetail() { this._detailEvent = null; this._recheckResult = null; this._actionResult = null; this._originPickerMode = false; this._render(); }
  _openDayDetail(ds) { this._dayDetailDate = ds; this._detailEvent = null; this._render(); }
  _closeDayDetail() { this._dayDetailDate = null; this._render(); }

  // ====================== REVIEW MODAL (fr-2026-05-11-b) ====================
  // Mirrors the web /review page so the user can apply/reject pending
  // proposals AND accept/hide pending calendar NEW/CHANGED rows from
  // HA without bouncing to the web app. All actions route through the
  // katja_schedule/* WS commands → /api/actions/* bearer endpoints →
  // the same server-side helpers the session-authed /events/* +
  // /review/proposed/* routes use. The drift-prevention test ensures
  // both surfaces stay aligned as new routes ship.

  async _openReview() {
    this._reviewOpen = true;
    this._reviewLoading = true;
    this._render();
    await this._refreshReview();
  }
  _closeReview() {
    this._reviewOpen = false;
    this._reviewInbox = null;
    this._reviewActionPending = new Set();
    this._render();
  }
  async _refreshReview() {
    if (!this._hass) return;
    this._reviewLoading = true;
    this._render();
    let result = null;
    let inboxErr = null;
    try {
      const r = await this._hass.callWS({type: "katja_schedule/list_review_inbox"});
      if (r && r.ok) result = r;
      else if (r) inboxErr = r.error || "Empty response from list_review_inbox";
    } catch (e) {
      inboxErr = e && e.message ? e.message : String(e);
    }
    // Fallback path: list_review_inbox lives only in HA integration
    // v0.18.0+. If the user updated the card via HACS but hasn't yet
    // pulled the integration (or restarted HA so the new WS commands
    // register), the modal would otherwise show "Nothing pending"
    // despite the pill showing N. Drop back to list_pending_proposals
    // (in every integration version since v0.15.0) and synthesise an
    // inbox shape carrying just the agent proposals. Calendar
    // NEW/CHANGED rows are not visible in this fallback — surface the
    // gap as a banner so the user knows to update the integration.
    if (!result) {
      try {
        const pp = await this._hass.callWS({type: "katja_schedule/list_pending_proposals"});
        const proposals = (pp && pp.proposals) || [];
        result = {
          ok: true,
          fallback: true,
          fallback_reason: inboxErr || "list_review_inbox not available",
          count: proposals.length,
          groups: proposals.map(p => ({
            event_id: "", calendar_item: null,
            proposals: [p], is_group: false
          })),
          recurring_batches: [],
        };
      } catch (e2) {
        result = {ok: false, groups: [], recurring_batches: [], count: 0,
                   error: inboxErr || (e2 && e2.message) || String(e2)};
      }
    }
    this._reviewInbox = result;
    this._reviewLoading = false;
    this._render();
    // Pull pending count + ghost rows back into the schedule view.
    this._fetchPendingProposals();
  }
  /** Generic dispatcher: optimistically marks the targeted ids as
   *  "in flight", fires the WS, then refreshes the inbox + schedule
   *  on response (success or fail). Single source of "review action
   *  ran" so we never end up with stale rows after a server-side
   *  change. */
  async _doReviewAction(wsType, msgExtra, optimisticIds) {
    if (!this._hass) return;
    const ids = optimisticIds || [];
    for (const id of ids) this._reviewActionPending.add(id);
    this._reviewActionError = null;
    this._render();
    try {
      await this._hass.callWS({type: wsType, ...(msgExtra || {})});
    } catch (e) {
      console.warn("KATJA review action failed:", wsType, e);
      // Surface the failure so the user knows the action didn't run
      // (most common cause: integration < v0.18.0 so the WS command
      // isn't registered yet). Banner stays until the next refresh.
      this._reviewActionError = (e && e.message)
        ? `${wsType.replace("katja_schedule/", "")}: ${e.message}`
        : `${wsType} failed`;
    }
    for (const id of ids) this._reviewActionPending.delete(id);
    await this._refreshReview();
  }
  // Per-row shortcuts the modal buttons + the inline event-detail
  // sheet share (fr-2026-05-11-b inline parity).
  _applyProposal(pe_id) {
    return this._doReviewAction("katja_schedule/apply_proposal",
                                  {pe_id}, [pe_id]);
  }
  _rejectProposal(pe_id) {
    return this._doReviewAction("katja_schedule/reject_proposal",
                                  {pe_id}, [pe_id]);
  }
  _acceptCalendarEvent(event_id) {
    return this._doReviewAction("katja_schedule/accept_event",
                                  {event_id}, [event_id]);
  }
  _hideCalendarEvent(event_id) {
    return this._doReviewAction("katja_schedule/hide_event",
                                  {event_id}, [event_id]);
  }
  // Bulk operations.
  _acceptAllNew() {
    return this._doReviewAction("katja_schedule/accept_all_new", {}, []);
  }
  _hideAllNew() {
    return this._doReviewAction("katja_schedule/hide_all_new", {}, []);
  }
  _acceptAllChanged() {
    return this._doReviewAction("katja_schedule/accept_all_changed", {}, []);
  }
  _acceptBatch(event_ids) {
    return this._doReviewAction("katja_schedule/accept_batch",
                                  {event_ids}, event_ids || []);
  }
  _hideBatch(event_ids) {
    return this._doReviewAction("katja_schedule/hide_batch",
                                  {event_ids}, event_ids || []);
  }
  _applyProposalsBatch(proposal_ids) {
    return this._doReviewAction("katja_schedule/apply_proposals_batch",
                                  {proposal_ids}, proposal_ids || []);
  }
  _rejectProposalsBatch(proposal_ids) {
    return this._doReviewAction("katja_schedule/reject_proposals_batch",
                                  {proposal_ids}, proposal_ids || []);
  }

  // ====================== RECHECK ======================

  // Arrive-by ISO from an event's start (or null for all-day / undated).
  // Sent as `arrival_time` to the backend so the recheck runs the
  // convergence loop and returns "Leave by X · arrives by Y" — same
  // experience the web app gives. All-day events fall through to
  // live-traffic mode (no arrival_time → backend uses departure=now).
  _arrivalISOFromEvent(ev) {
    return ev?.start?.dateTime || null;
  }

  async _recheckDriveWithOrigin(ev, originAlias) {
    if (!this._hass) return;
    this._recheckLoading = true; this._originPickerMode = false; this._render();
    try {
      // For flight events, route the drive against the LA-area airport
      // and invert direction for inbound (pickup) flights — same logic
      // as the web app's flightAirportInfo / origin-picker swap
      // (fr-2026-05-06-c). The originAlias the user tapped (home/work)
      // becomes the start for outbound, the END for inbound.
      const flightInfo = this._flightAirportInfo(ev);
      let origin = originAlias, destination = ev.location || "";
      if (flightInfo && flightInfo.address) {
        if (flightInfo.direction === "inbound") {
          origin = flightInfo.address;
          destination = originAlias;
        } else {
          destination = flightInfo.address;
        }
      }
      const msg = {
        type: "katja_schedule/refresh_drive", origin, destination,
      };
      const arrivalISO = this._arrivalISOFromEvent(ev);
      if (arrivalISO) msg.arrival_time = arrivalISO;
      this._recheckResult = await this._hass.callWS(msg);
    } catch (e) { this._recheckResult = { ok: false, error: e.message }; }
    this._recheckLoading = false; this._render();
  }

  async _recheckDrive(ev) {
    if (!this._hass) return;
    this._recheckLoading = true; this._render();
    try {
      // Hand the raw event fields to the server — it owns the drive-row
      // parser now. Previously the card had its own regex which drifted
      // from the web parser (bug-20260509-150030: card kept the buggy
      // `^[🚗\s]*(?:drive\s+)?` regex after the web fix shipped May 9).
      const msg = {
        type: "katja_schedule/refresh_drive",
        event: { what: ev.summary || "", where: ev.location || "" },
      };
      const arrivalISO = this._arrivalISOFromEvent(ev);
      if (arrivalISO) msg.arrival_time = arrivalISO;
      this._recheckResult = await this._hass.callWS(msg);
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

  async _skipThisWeek(ev) {
    if (!this._hass || !ev?._eventId) return;
    const what = (ev.summary || "").trim();
    const ok = confirm(
      `Skip "${what}" for this week?\n\n` +
      "The event stays on the schedule (with a ⚠️ prefix and crossed out) " +
      "so you remember it was on the calendar — and it returns automatically " +
      "next week."
    );
    if (!ok) return;
    this._actionLoading = true; this._render();
    try {
      this._actionResult = await this._hass.callWS({
        type: "katja_schedule/skip_week",
        event_id: ev._eventId,
      });
      // Trigger a re-fetch so the prefixed/strikethrough form shows up.
      this._lastFetch = 0;
      this._closeDetail();
      this._fetchEvents();
    } catch (e) {
      this._actionResult = { ok: false, error: e.message };
    }
    this._actionLoading = false; this._render();
  }

  // ====================== RENDER ======================

  _render() {
    if (!this.shadowRoot) return;
    // Fold pending proposals into the visible event list (fr-2026-05-07-d):
    //  - update/hide/accept/merge → annotate matched event with _pendingProposal
    //  - remove → annotate; the row stays visible (the deletion is what's
    //    pending, not the disappearance) so the user sees what acceptance
    //    would drop
    //  - add → synthesize a ghost calendar event so the proposed row
    //    appears on its target day even though no real calendar event
    //    backs it yet
    let working;
    if (this._pendingProposals?.length) {
      working = this._events.map(ev => {
        const m = this._matchPendingProposal(ev);
        return m ? {...ev, _pendingProposal: m} : ev;
      });
      working = working.concat(this._ghostEventsForPendingAdds());
    } else {
      working = this._events;
    }
    // _renderEvent and the click handler index into _renderedEvents
    // (this can include ghost rows that aren't in this._events).
    this._renderedEvents = working;
    const grouped = this._groupByDate(working);
    const { pendingCount, syncText, buildInfo } = this._getSensorData();

    let body = "";
    const locked = this._lockedView;
    if (locked === "today") {
      const ds = this._todayStr();
      body = this._renderDay(ds, grouped[ds] || []);
    } else if (locked === "tomorrow") {
      const ds = this._tomorrowStr();
      body = this._renderDay(ds, grouped[ds] || []);
    } else if (locked === "calendar") {
      body = this._renderCalendarGrid(this._getMonAlignedDays(), grouped);
    } else if (locked === "dayview") {
      body = this._renderDayView(grouped);
    } else if (locked === "dayview-today") {
      body = this._renderDayViewToday(grouped);
    } else if (this._view === "overview") {
      body = this._renderOverview(grouped);
    } else if (this._view === "dayview") {
      body = this._renderDayView(grouped);
    } else if (this._view === "schedule") {
      body = this._renderSchedule(grouped);
    } else {
      body = this._renderCalendarGrid(this._getMonAlignedDays(), grouped);
    }

    const modal = this._reviewOpen ? this._renderReviewModal()
                : this._detailEvent ? this._renderDetailModal(this._detailEvent)
                : this._dayDetailDate ? this._renderDayDetailModal(this._dayDetailDate, grouped)
                : "";

    const showHeader = !locked || locked === "overview" || locked === "schedule";
    // fr-2026-05-11-b (follow-up): hide the view-switcher pill on the
    // Overview view — Ken's wall display already treats Overview as
    // the home surface, so the pill at the top duplicates other
    // navigation in the dashboard. Schedule + Calendar still carry
    // the pill so the user has a way back to Overview from each.
    const showToggle = !locked && this._view !== "overview";
    const showThemeBtn = this._showThemeToggle;
    // fr-2026-05-11-b: the global 🗑 only makes sense on the Calendar
    // view, where rows aren't grouped by day so a per-day chip would be
    // out of place. Overview + Schedule rely on the per-day chip Ken
    // asked for ("show/hide should be per-day in the schedule views,
    // and across everything in the calendar views"). Compute the count
    // up-front so the label can read "🗑 12" rather than just "🗑".
    const effectiveView = locked || this._view;
    const showGlobalFlaggedToggle = effectiveView === "calendar";
    const globalFlaggedCount = showGlobalFlaggedToggle
      ? this._flaggedCountAcrossDays(grouped, this._getMonAlignedDays())
      : 0;
    const globalFlaggedBtnHTML = (showGlobalFlaggedToggle && globalFlaggedCount > 0)
      ? `<button class="flagged-btn${this._showFlagged ? " active" : ""}" id="flagged-toggle" title="${this._showFlagged ? "Hide" : "Show"} ${globalFlaggedCount} cancelled/skipped/hidden across the grid">🗑 ${globalFlaggedCount}</button>`
      : "";

    const seamClasses = Array.from(this._seam).map(s => ` seam-${s}`).join("");
    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <ha-card><div class="card${locked ? " card-locked" : ""}${seamClasses}">
        ${showHeader ? `<div class="header">
          <span class="title">${_esc(this._config.title || "Family Schedule")}</span>
          ${showToggle ? `<div class="view-toggle">
            ${[["overview","Overview"],["dayview","Day View"],["schedule","Schedule"],["calendar","Calendar"]].map(([v,label]) =>
              `<button class="toggle-btn ${this._view===v?"active":""}" data-view="${v}">${label}</button>`
            ).join("")}
          </div>` : ""}
          <div class="meta">
            ${pendingCount > 0 ? `<button class="badge pending-pill" id="open-review" title="Open review queue">${pendingCount} pending</button>` : ""}
            ${syncText ? `<span>Synced ${_esc(syncText)}</span>` : ""}
            <span class="version">v${CARD_VERSION}${buildInfo ? ` · app ${_esc(buildInfo)}` : ""}</span>
            ${this._showThemeToggle ? `<button class="theme-btn" id="theme-cycle">${_esc(THEMES[this._theme].name)}</button>` : ""}
            ${globalFlaggedBtnHTML}
          </div>
        </div>` : ""}
        ${!showHeader ? `<div class="floating-theme">
          ${globalFlaggedBtnHTML}
          ${showThemeBtn ? `<button class="theme-btn" id="theme-cycle">${_esc(THEMES[this._theme].name)}</button>` : ""}
        </div>` : ""}
        ${body}${modal}
      </div></ha-card>`;

    // Bind events
    this.shadowRoot.querySelectorAll(".toggle-btn").forEach(btn => btn.addEventListener("click", () => this._switchView(btn.dataset.view)));
    this.shadowRoot.querySelector("#theme-cycle")?.addEventListener("click", () => this._cycleTheme());
    this.shadowRoot.querySelectorAll("#flagged-toggle").forEach(btn => btn.addEventListener("click", (e) => { e.stopPropagation(); this._toggleFlagged(); }));
    // fr-2026-05-11-a: per-day 🗑 buttons. Each carries data-day-flagged
    // = the day-iso it controls.
    this.shadowRoot.querySelectorAll(".day-flagged-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const ds = btn.getAttribute("data-day-flagged");
        if (ds) this._toggleDayFlagged(ds);
      });
    });
    this.shadowRoot.querySelectorAll("[data-event-idx]").forEach(el => el.addEventListener("click", () => {
      const ev = (this._renderedEvents || this._events)[parseInt(el.dataset.eventIdx)];
      if (!ev) return;
      // Ghost rows for pending `add` proposals don't back any
      // calendar event — they're a render-time visualization only.
      // Acting on them happens from the web schedule (Approve/Reject
      // inline). Skip the detail modal in that case.
      const isGhost = ev._pendingProposal?.kind === "add" && !ev._eventId;
      if (!isGhost) this._openDetail(ev);
    }));
    this.shadowRoot.querySelector(".modal-close")?.addEventListener("click", () => {
      if (this._reviewOpen) this._closeReview();
      else if (this._detailEvent) this._closeDetail();
      else if (this._dayDetailDate) this._closeDayDetail();
    });
    const backdrop = this.shadowRoot.querySelector(".modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        if (this._reviewOpen) this._closeReview();
        else if (this._detailEvent) this._closeDetail();
        else if (this._dayDetailDate) this._closeDayDetail();
      }
    });
    // fr-2026-05-11-b: review-modal open + per-action dispatcher.
    this.shadowRoot.querySelector("#open-review")?.addEventListener("click",
      (e) => { e.stopPropagation(); this._openReview(); });
    this.shadowRoot.querySelectorAll("[data-review-action]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.getAttribute("data-review-action");
        const peId = btn.getAttribute("data-pe-id") || "";
        const evId = btn.getAttribute("data-event-id") || "";
        const eventIds = (btn.getAttribute("data-event-ids") || "")
          .split(",").map(s => s.trim()).filter(Boolean);
        const proposalIds = (btn.getAttribute("data-proposal-ids") || "")
          .split(",").map(s => s.trim()).filter(Boolean);
        if (action === "applyProposal")  this._applyProposal(peId);
        else if (action === "rejectProposal") this._rejectProposal(peId);
        else if (action === "acceptEvent") this._acceptCalendarEvent(evId);
        else if (action === "hideEvent")   this._hideCalendarEvent(evId);
        else if (action === "acceptAllNew") this._acceptAllNew();
        else if (action === "hideAllNew")   this._hideAllNew();
        else if (action === "acceptAllChanged") this._acceptAllChanged();
        else if (action === "acceptBatch")  this._acceptBatch(eventIds);
        else if (action === "hideBatch")    this._hideBatch(eventIds);
        else if (action === "applyProposalsBatch") this._applyProposalsBatch(proposalIds);
        else if (action === "rejectProposalsBatch") this._rejectProposalsBatch(proposalIds);
      });
    });
    this.shadowRoot.querySelectorAll("[data-day-date]").forEach(el =>
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-event-idx]")) return; // let event clicks through
        this._openDayDetail(el.dataset.dayDate);
      }));
    this.shadowRoot.querySelector(".recheck-drive")?.addEventListener("click", () => this._recheckDrive(this._detailEvent));
    this.shadowRoot.querySelector(".recheck-flight")?.addEventListener("click", () => this._recheckFlight(this._detailEvent));
    this.shadowRoot.querySelector(".recheck-check")?.addEventListener("click", () => this._recheckDrive(this._detailEvent));
    this.shadowRoot.querySelectorAll(".origin-btn").forEach(btn => btn.addEventListener("click", () => this._recheckDriveWithOrigin(this._detailEvent, btn.dataset.origin)));
    this.shadowRoot.querySelector(".skip-week-btn")?.addEventListener("click", () => this._skipThisWeek(this._detailEvent));
    // fr-2026-05-11-b: inline Accept/Reject on the event-detail sheet.
    this.shadowRoot.querySelector(".inline-apply")?.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-pe-id");
      if (id) { await this._applyProposal(id); this._closeDetail(); }
    });
    this.shadowRoot.querySelector(".inline-reject")?.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-pe-id");
      if (id) { await this._rejectProposal(id); this._closeDetail(); }
    });
    this.shadowRoot.querySelector(".inline-accept-cal")?.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-event-id");
      if (id) { await this._acceptCalendarEvent(id); this._closeDetail(); }
    });
    this.shadowRoot.querySelector(".inline-hide-cal")?.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-event-id");
      if (id) { await this._hideCalendarEvent(id); this._closeDetail(); }
    });
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

  // ====================== REVIEW MODAL ======================

  _renderReviewModal() {
    const inbox = this._reviewInbox;
    const loading = this._reviewLoading;
    const pending = this._reviewActionPending;
    let body = "";
    if (loading || !inbox) {
      body = `<div class="review-loading">Loading review queue…</div>`;
    } else if (!inbox.ok && inbox.error) {
      body = `<div class="review-error">Couldn't load review queue: ${_esc(inbox.error)}</div>`;
    } else {
      const batches = inbox.recurring_batches || [];
      const groups = inbox.groups || [];
      // Aggregate counts so the bulk-action buttons have honest labels.
      const newIds = [], changedIds = [], proposalIds = [];
      for (const g of groups) {
        const ci = g.calendar_item || null;
        if (ci) {
          if (ci.status === "new") newIds.push(ci.event_id || "");
          else if (ci.status === "changed") changedIds.push(ci.event_id || "");
        }
        for (const p of (g.proposals || [])) proposalIds.push(p.id);
      }
      const allDisabled = pending.size > 0;
      const dis = allDisabled ? " disabled" : "";

      // ---- Section: recurring batches ------------------------------
      let batchesHtml = "";
      if (batches.length) {
        batchesHtml = `<div class="review-section">
          <h3 class="review-section-title">Recurring batches</h3>
          ${batches.map(b => {
            const ids = b.event_ids || [];
            const acceptingNow = ids.every(i => pending.has(i));
            const aDis = (allDisabled || acceptingNow) ? " disabled" : "";
            return `<div class="review-batch">
              <div class="review-batch-summary">
                <strong>${_esc(b.what || "")}</strong> · ${_esc(b.who || "")} ·
                ${b.count} occurrences
                <span class="review-batch-dates">${_esc((b.dates || []).slice(0,3).join(", "))}${(b.dates||[]).length>3?"…":""}</span>
              </div>
              <div class="review-actions">
                <button class="review-btn accept" data-review-action="acceptBatch" data-event-ids="${_esc(ids.join(","))}"${aDis}>Accept all ${b.count}</button>
                <button class="review-btn hide" data-review-action="hideBatch" data-event-ids="${_esc(ids.join(","))}"${aDis}>Hide all ${b.count}</button>
              </div>
            </div>`;
          }).join("")}
        </div>`;
      }

      // ---- Section: groups (calendar items + standalone proposals) -
      let groupsHtml = "";
      if (groups.length) {
        groupsHtml = `<div class="review-section">
          <h3 class="review-section-title">${groups.length} item${groups.length===1?"":"s"} pending</h3>
          ${groups.map(g => this._renderReviewGroup(g, pending, allDisabled)).join("")}
        </div>`;
      } else if (!batches.length) {
        body = `<div class="review-empty">Nothing pending. 🎉</div>`;
      }

      // ---- Bulk action bar ---------------------------------------
      const bulkBar = (groups.length + batches.length) > 0 ? `<div class="review-bulkbar">
        ${newIds.length ? `<button class="review-btn-bulk accept" data-review-action="acceptAllNew"${dis}>Accept all ${newIds.length} new</button>` : ""}
        ${newIds.length ? `<button class="review-btn-bulk hide" data-review-action="hideAllNew"${dis}>Hide all ${newIds.length} new</button>` : ""}
        ${changedIds.length ? `<button class="review-btn-bulk accept" data-review-action="acceptAllChanged"${dis}>Accept all ${changedIds.length} changed</button>` : ""}
        ${proposalIds.length ? `<button class="review-btn-bulk accept" data-review-action="applyProposalsBatch" data-proposal-ids="${_esc(proposalIds.join(","))}"${dis}>Apply all ${proposalIds.length} proposals</button>` : ""}
        ${proposalIds.length ? `<button class="review-btn-bulk reject" data-review-action="rejectProposalsBatch" data-proposal-ids="${_esc(proposalIds.join(","))}"${dis}>Reject all ${proposalIds.length} proposals</button>` : ""}
      </div>` : "";

      // Stacked banners above the body:
      //   1. Fallback notice — list_review_inbox unavailable, showing
      //      only agent proposals (no calendar NEW/CHANGED). Hint:
      //      update the HA integration to v0.18.0+ for full parity.
      //   2. Action error — last review action failed (often: WS
      //      command not registered yet, same integration-version
      //      cause). Keeps the queue visible so retries are one tap.
      let banners = "";
      if (inbox.fallback) {
        banners += `<div class="review-banner review-banner-warn">
          ⚠️ Limited view — update HA integration to v0.18.0+ for
          calendar NEW/CHANGED parity. Showing agent proposals only.
        </div>`;
      }
      if (this._reviewActionError) {
        banners += `<div class="review-banner review-banner-err">
          ❌ Action failed: ${_esc(this._reviewActionError)}
        </div>`;
      }
      if (!body) body = banners + bulkBar + batchesHtml + groupsHtml;
    }

    return `<div class="modal-backdrop">
      <div class="modal review-modal">
        <div class="modal-header">
          <span class="modal-title">Review queue</span>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body review-body">${body}</div>
      </div>
    </div>`;
  }

  /** Render one inbox group. The folding rule (fr-2026-05-05-f) means
   *  a single group may carry a calendar item AND one or more agent
   *  proposals targeting that same event_id — applying any proposal
   *  auto-rejects the others server-side, so we render the calendar
   *  row + its associated proposals as a stacked block. */
  _renderReviewGroup(g, pending, allDisabled) {
    const ci = g.calendar_item || null;
    const proposals = g.proposals || [];
    const calIsPending = ci && pending.has(ci.event_id || "");
    const dis = allDisabled ? " disabled" : "";
    let calHtml = "";
    if (ci) {
      const statusLabel = ({new:"NEW", changed:"CHANGED", orphan:"ORPHAN", conflict:"CONFLICT"})[ci.status] || ci.status.toUpperCase();
      const cDis = (allDisabled || calIsPending) ? " disabled" : "";
      calHtml = `<div class="review-item review-item-calendar review-status-${_esc(ci.status)}">
        <div class="review-item-tag">${_esc(statusLabel)}</div>
        <div class="review-item-main">
          <div class="review-item-line"><strong>${_esc(ci.what || "")}</strong></div>
          <div class="review-item-meta">${_esc(ci.date || "")} ${_esc(ci.time || "")} · ${_esc(ci.who || "")}${ci.where ? " · " + _esc(ci.where) : ""}</div>
        </div>
        <div class="review-actions">
          <button class="review-btn accept" data-review-action="acceptEvent" data-event-id="${_esc(ci.event_id || "")}"${cDis}>Accept</button>
          <button class="review-btn hide" data-review-action="hideEvent" data-event-id="${_esc(ci.event_id || "")}"${cDis}>Hide</button>
        </div>
      </div>`;
    }
    const proposalHtml = proposals.map(p => {
      const pDis = (allDisabled || pending.has(p.id)) ? " disabled" : "";
      const summary = p.summary || (`${p.kind} ${JSON.stringify(p.args || {}).slice(0,80)}`);
      return `<div class="review-item review-item-proposal">
        <div class="review-item-tag review-tag-agent">AGENT</div>
        <div class="review-item-main">
          <div class="review-item-line">${_esc(summary)}</div>
          ${p.added_at ? `<div class="review-item-meta">queued ${_esc(p.added_at.slice(0,16).replace("T", " "))}</div>` : ""}
        </div>
        <div class="review-actions">
          <button class="review-btn accept" data-review-action="applyProposal" data-pe-id="${_esc(p.id)}"${pDis}>Apply</button>
          <button class="review-btn reject" data-review-action="rejectProposal" data-pe-id="${_esc(p.id)}"${pDis}>Reject</button>
        </div>
      </div>`;
    }).join("");
    return `<div class="review-group">${calHtml}${proposalHtml}</div>`;
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

    // Skip-this-week — only meaningful for accepted overlay events that
    // haven't been skipped/cancelled already. Mirrors the web app's flow.
    const flagged = this._isFlagged(ev);
    const status = ev._status || "";
    const isAccepted = !!ev._eventId && !flagged
      && status !== "new" && status !== "changed"
      && status !== "conflict" && status !== "orphan";
    let skipSection = "";
    if (isAccepted) {
      skipSection = `<button class="skip-week-btn" ${this._actionLoading?"disabled":""}>⚠️ Skip this week</button>`;
    }

    // fr-2026-05-11-b: inline Accept/Reject affordance when this event
    // has a pending agent proposal or a pending calendar diff. Mirrors
    // the per-row buttons on the web /review page so the user can act
    // straight from the event-sheet without opening the full review
    // modal. Three shapes:
    //   - calendar NEW    → Accept / Hide (via /events/accept|hide)
    //   - calendar CHANGED → Accept / Hide (same endpoints)
    //   - agent proposal  → Apply / Reject (via /review/proposed/*)
    let inlineReviewSection = "";
    const pp = ev._pendingProposal;
    const peId = pp?.id || "";
    const evId = ev._eventId || (ev.id || "");
    const inFlight = (this._reviewActionPending?.has(peId)
                       || (evId && this._reviewActionPending?.has(evId)));
    const idis = inFlight ? " disabled" : "";
    if (pp && pp.kind && pp.kind !== "add" && peId) {
      // Standalone agent proposal attached to an existing event (update,
      // hide, accept, merge). Apply / Reject route to the agent helper.
      inlineReviewSection = `<div class="inline-review-bar">
        <span class="inline-review-label">Pending ${_esc(pp.kind)} from agent</span>
        <button class="review-btn accept inline-apply" data-pe-id="${_esc(peId)}"${idis}>Apply</button>
        <button class="review-btn reject inline-reject" data-pe-id="${_esc(peId)}"${idis}>Reject</button>
      </div>`;
    } else if (!pp && (status === "new" || status === "changed") && evId) {
      // Calendar diff row — promote into overlay or hide it.
      inlineReviewSection = `<div class="inline-review-bar">
        <span class="inline-review-label">Calendar ${_esc(status.toUpperCase())}</span>
        <button class="review-btn accept inline-accept-cal" data-event-id="${_esc(evId)}"${idis}>Accept</button>
        <button class="review-btn hide inline-hide-cal" data-event-id="${_esc(evId)}"${idis}>Hide</button>
      </div>`;
    }

    // Recheck section. Flight events get TWO affordances side-by-side
    // (matches the web's event-sheet UX from bug-20260505-122645):
    // a Recheck Flight Status button on top, and below it an origin
    // picker for "drive to/from the LA-area airport" with a label
    // that swaps per direction (outbound: "to LAX from:", inbound:
    // "from LAX to:").
    let recheckSection = "";
    const flightInfo = isFlight ? this._flightAirportInfo(ev) : null;
    if (isFlight) {
      recheckSection = `<button class="recheck-btn recheck-flight" ${this._recheckLoading?"disabled":""}>${this._recheckLoading?"⏳ Checking...":"🔄 Recheck Flight"}</button>`;
      if (flightInfo) {
        const lbl = flightInfo.direction === "inbound"
          ? `Check drive time from ${flightInfo.iata} to:`
          : `Check drive time to ${flightInfo.iata} from:`;
        recheckSection += `
          <div class="origin-picker" style="margin-top:10px">
            <div class="origin-label">${_esc(lbl)}</div>
            <div class="origin-buttons">
              <button class="origin-btn" data-origin="home" ${this._recheckLoading?"disabled":""}>🏠 Home</button>
              <button class="origin-btn" data-origin="nz consulate" ${this._recheckLoading?"disabled":""}>🏢 Work</button>
            </div>
          </div>`;
      }
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
          trafficLine = `<div class="traffic-warn">⚠️ <strong>No traffic data</strong> — base estimate only. Actual time may be longer.<br><span class="traffic-meta">${_esc(depTime)} · Checked ${_esc(checkedAt)}</span></div>`;
        } else {
          trafficLine = `<div class="traffic-ok">⚡ Includes ${_esc(r.traffic_note||"current traffic")} estimate${r.duration_without_traffic_text ? ` (${_esc(r.duration_without_traffic_text)} without traffic)` : ""}<br><span class="traffic-meta">${_esc(depTime)} · Checked ${_esc(checkedAt)}</span></div>`;
        }

        // Action buttons
        let actions = "";
        if (!this._actionResult) {
          if (isDrive) {
            actions = `<button class="action-btn action-update" ${this._actionLoading?"disabled":""}>${this._actionLoading?"⏳ Updating...": `✓ Update to ${_esc(r.duration_text)} (with traffic)`}</button>`;
          } else {
            actions = `<button class="action-btn action-add-drive" ${this._actionLoading?"disabled":""}>${this._actionLoading?"⏳ Adding...": `＋ Add ${_esc(r.duration_text)} drive row before this event (with traffic)`}</button>`;
          }
        }

        // Arrive-by banner — green "Leave by X · arrives by Y" when
        // the backend ran convergence; red "Running late" when the
        // user can't make it in time. Mirrors the web app's recheck
        // result panel (fr-2026-05-05-f / arrive-by convergence).
        let arriveBanner = "";
        if (r.degraded_from_late_departure) {
          const proj = r.projected_arrival_local ? this._fmtTs(r.projected_arrival_local) : "—";
          const tgt  = r.arrival_time_resolved   ? this._fmtTs(r.arrival_time_resolved)   : "—";
          const lateStr = r.late_by_text ? `, ${_esc(r.late_by_text)} after target ${_esc(tgt)}` : "";
          arriveBanner = `<div class="recheck-late">⚠️ <strong>Running late</strong> — ${_esc(r.duration_text)} drive in current traffic puts arrival at <strong>${_esc(proj)}</strong>${lateStr}.</div>`;
        } else if (r.is_arrive_by) {
          const dep = r.recommended_departure_local ? this._fmtTs(r.recommended_departure_local) : "—";
          const arr = r.arrival_time_resolved        ? this._fmtTs(r.arrival_time_resolved)        : "—";
          arriveBanner = `<div class="recheck-arrive">🚗 <strong>Leave by ${_esc(dep)}</strong> · arrives by ${_esc(arr)}</div>`;
        }
        resultSection = `<div class="recheck-result ok">
          ${arriveBanner}
          <div class="recheck-route"><span class="recheck-label">From:</span> ${_esc(o.resolved||o.input||"?")}</div>
          <div class="recheck-route"><span class="recheck-label">To:</span> ${_esc(d.resolved||d.input||"?")}</div>
          <div class="recheck-duration"><strong>${_esc(r.duration_text)}</strong>${r.duration_pessimistic_text && r.duration_pessimistic_text !== r.duration_text ? ` <span class="recheck-pessimistic">(up to ${_esc(r.duration_pessimistic_text)} worst-case)</span>` : ""}</div>
          ${trafficLine}
          <div class="recheck-via">${_esc(r.distance_text)} via ${_esc(r.summary||"—")}</div>
          ${actions}
        </div>`;
      } else if (r.ok && r.status) {
        const est = r.estimated_arrival_local || r.destination?.scheduled_local || "";
        // 'unknown' = provider returned a status we couldn't classify; show
        // a friendlier label so the rest of the row still reads cleanly.
        // (mirrors web fix for bug-20260506-204817)
        const statusLabel = r.status === "unknown" ? "Status pending" : r.status;
        resultSection = `<div class="recheck-result ok"><strong>${_esc(statusLabel)}</strong>${est?" — arrival "+_esc(est):""}${r.gate?" · gate "+_esc(r.gate):""}</div>`;
      } else if (!r.ok) {
        resultSection = `<div class="recheck-result err">${_esc(r.error || "Unknown error")}</div>`;
      }
    }

    // Agent action result
    let actionSection = "";
    if (this._actionResult) {
      if (this._actionResult.ok) {
        actionSection = `<div class="action-result ok">✓ ${_esc(this._actionResult.text || "Done")}</div>`;
      } else {
        actionSection = `<div class="action-result err">${_esc(this._actionResult.error || "Action failed")}</div>`;
      }
    }

    return `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-dot" style="background:${_esc(color)}"></span>
            <span class="modal-title">${_esc(summary)}</span>
            <button class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="modal-row"><span class="modal-label">When</span><span>${_esc(dateLabel)}, ${_esc(time)}</span></div>
            ${location ? `<div class="modal-row"><span class="modal-label">Where</span><span>${_esc(location)}</span></div>` : ""}
            ${description && description !== location ? `<div class="modal-row"><span class="modal-label">Details</span><span class="modal-desc">${_esc(description)}</span></div>` : ""}
            <div class="modal-row"><span class="modal-label">Who</span><span>${_esc(ev._label || "—")}</span></div>
            ${inlineReviewSection}
            ${recheckSection}
            ${resultSection}
            ${actionSection}
            ${skipSection}
          </div>
        </div>
      </div>`;
  }

  // ====================== DAY DETAIL MODAL ======================

  _renderDayDetailModal(ds, grouped) {
    const events = grouped[ds] || [];
    const dateLabel = this._formatDateHeader(ds);
    return `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-dot" style="background:#4ECDC4"></span>
            <span class="modal-title">${_esc(dateLabel)}</span>
            <button class="modal-close">✕</button>
          </div>
          <div class="modal-body" style="padding: 8px 16px;">
            ${events.length === 0 ? '<div class="no-events">No events</div>' :
              events.map(ev => this._renderEvent(ev)).join("")}
          </div>
        </div>
      </div>`;
  }

  // ====================== OVERVIEW / SCHEDULE / CALENDAR ======================

  _panelStyle(panelKey) {
    // Inline style="--xxx: ..." that overrides theme tokens for one panel.
    // Returns "" when the panel uses the card's main theme so unstyled panels
    // skip the inline-style noise entirely.
    const name = this._panelThemes && this._panelThemes[panelKey];
    return name ? ` data-panel="${panelKey}" style="${this._themeVars(name)}"` : "";
  }

  _renderOverview(grouped) {
    const todayDs = this._todayStr(), tomorrowDs = this._tomorrowStr();
    return `<div class="overview-top"><div class="overview-col"${this._panelStyle("today")}>${this._renderDay(todayDs, grouped[todayDs]||[])}</div><div class="overview-col"${this._panelStyle("tomorrow")}>${this._renderDay(tomorrowDs, grouped[tomorrowDs]||[])}</div></div><div class="overview-divider"></div><div${this._panelStyle("calendar")}>${this._renderCalendarGrid(this._getMonAlignedDays(), grouped)}</div>`;
  }

  // Day View — 4-cell layout matching the web template's dayview mode.
  // Row 1: today list + today hour-axis grid. Row 2: tomorrow same.
  // Mirrors templates/schedule.html buildOneDayGrid output shape so the
  // two surfaces feel like the same UI.
  _renderDayView(grouped) {
    const todayDs = this._todayStr(), tmrwDs = this._tomorrowStr();
    return `<div class="dayview-stack">
      <div class="dayview-row">
        <div class="dayview-col-list">${this._renderDay(todayDs, grouped[todayDs] || [])}</div>
        <div class="dayview-col-grid">${this._renderDayHourAxis(todayDs, grouped[todayDs] || [])}</div>
      </div>
      <div class="dayview-row">
        <div class="dayview-col-list">${this._renderDay(tmrwDs, grouped[tmrwDs] || [])}</div>
        <div class="dayview-col-grid">${this._renderDayHourAxis(tmrwDs, grouped[tmrwDs] || [])}</div>
      </div>
    </div>`;
  }

  // Day View (today only) — single row variant of _renderDayView for
  // dashboards where space is tight and only today's plan matters.
  // Same per-row markup as Day View, just without the tomorrow row.
  _renderDayViewToday(grouped) {
    const todayDs = this._todayStr();
    return `<div class="dayview-stack">
      <div class="dayview-row">
        <div class="dayview-col-list">${this._renderDay(todayDs, grouped[todayDs] || [])}</div>
        <div class="dayview-col-grid">${this._renderDayHourAxis(todayDs, grouped[todayDs] || [])}</div>
      </div>
    </div>`;
  }

  // Render a single day's vertical hour-axis grid. Hour labels in the
  // left gutter, event blocks absolutely positioned by time. NOW line
  // (red) only on today's column. Pacific time always.
  _renderDayHourAxis(ds, events) {
    const isToday = this._isToday(ds);
    const totalHours = DV_DAY_END - DV_DAY_START + 1;
    const canvasHeight = totalHours * DV_HOUR_PX;

    // Hour labels (left gutter).
    const hourLabels = [];
    for (let h = DV_DAY_START; h <= DV_DAY_END; h++) {
      const display = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
      const top = (h - DV_DAY_START) * DV_HOUR_PX;
      hourLabels.push(`<div class="dv-hour-lbl" style="top:${top}px">${display}</div>`);
    }

    // Event blocks. Only include events with concrete start+end datetimes
    // (Pacific). All-day events show in the LIST column already; the
    // hour-axis is just for timed events.
    const blocks = (events || [])
      .filter(ev => ev.start?.dateTime && ev.end?.dateTime)
      .filter(ev => this._showFlagged || !this._isFlagged(ev))
      .map((ev, idx) => {
        const s = this._pacificTimeParts(ev.start.dateTime);
        const e = this._pacificTimeParts(ev.end.dateTime);
        if (!s || !e) return "";
        const to24 = (p) => (p.ampm === "PM" && p.h !== 12 ? p.h + 12
                              : p.ampm === "AM" && p.h === 12 ? 0 : p.h);
        let startMin = to24(s) * 60 + s.m;
        let endMin = to24(e) * 60 + e.m;
        startMin = Math.max(startMin, DV_DAY_START * 60);
        endMin = Math.min(endMin, (DV_DAY_END + 1) * 60);
        if (endMin <= startMin) return "";
        const top = (startMin - DV_DAY_START * 60) / 60 * DV_HOUR_PX;
        const naturalPx = (endMin - startMin) / 60 * DV_HOUR_PX - 2;
        // Floor at 12px (tap-target minimum). Anything <26 min at
        // 32 px/hr hits the floor and renders identically — the
        // sub-half-hour bucket is the right granularity to collapse.
        const height = Math.max(12, naturalPx);
        const isCompact = naturalPx < 32;
        const color = _esc(ev._color || "#888");
        const flagged = this._isFlagged(ev);
        const isDrive = this._isDrive(ev.summary || "");
        const pending = ev._pendingProposal?.kind || "";
        const cls = `dv-event${isCompact ? " is-compact" : ""}${flagged ? " is-flagged" : ""}${isDrive ? " is-drive" : ""}${pending ? ` is-pending pending-${pending}` : ""}`;
        const evIdx = (this._renderedEvents || this._events || []).indexOf(ev);
        const timeStr = this._formatTime(ev);
        const summary = _esc(ev.summary || "");
        const where = ev.location ? `<div class="dv-ev-where">${_esc(ev.location)}</div>` : "";
        return `<div class="${cls}" data-event-idx="${evIdx}" style="top:${top}px; height:${height}px; border-left: 3px solid ${color};">
          <div class="dv-ev-time">${timeStr}</div>
          <div class="dv-ev-what">${summary}</div>
          ${isCompact ? "" : where}
        </div>`;
      }).join("");

    // NOW line — only on today's column.
    let nowLine = "";
    if (isToday) {
      const now = this._pacificNow();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin >= DV_DAY_START * 60 && nowMin <= (DV_DAY_END + 1) * 60) {
        const top = (nowMin - DV_DAY_START * 60) / 60 * DV_HOUR_PX;
        nowLine = `<div class="dv-now" style="top:${top}px"></div>`;
      }
    }

    return `<div class="dv-grid">
      <div class="dv-canvas" style="height:${canvasHeight}px; --hour-px:${DV_HOUR_PX}px">
        <div class="dv-hours">${hourLabels.join("")}</div>
        ${blocks}
        ${nowLine}
      </div>
    </div>`;
  }

  _renderSchedule(grouped) {
    return `<div class="days">${this._getDaysFromToday(14).map(ds => this._renderDay(ds, grouped[ds]||[])).join("")}</div>`;
  }

  _renderDay(ds, events) {
    const isToday = this._isToday(ds), isTomorrow = this._isTomorrow(ds);
    const d = new Date(ds+"T12:00:00"), isWeekend = d.getDay()===0||d.getDay()===6;
    let cls = "day"; if (isToday) cls+=" is-today"; if (isTomorrow) cls+=" is-tomorrow"; if (isWeekend) cls+=" weekend";
    // fr-2026-05-11-a / -b: per-day 🗑 chip with the hidden-count
    // label, shown only when this day actually has cancelled/skipped/
    // rule-hidden rows. Days with nothing to reveal don't carry the
    // chip (Ken's screenshot showed empty header — fr-2026-05-11-b
    // adds the count so the affordance is visible AND useful).
    const dayActive = this._dayShowsFlagged(ds);
    const flaggedCount = this._flaggedCountForDay(events);
    const dayBtn = flaggedCount > 0
      ? `<button class="day-flagged-btn${dayActive?" active":""}" data-day-flagged="${_esc(ds)}" title="${dayActive?"Hide":"Show"} ${flaggedCount} cancelled/skipped on this day">🗑 ${flaggedCount}</button>`
      : "";
    return `<div class="${cls}"><div class="day-header"><span class="day-dot"></span>${this._formatDateHeader(ds)}${events.length>0&&!isToday?`<span class="event-count">${events.length} event${events.length!==1?"s":""}</span>`:""}${dayBtn}</div><div class="events">${events.length===0?'<div class="no-events">No events</div>':events.map(ev=>this._renderEvent(ev, ds)).join("")}</div></div>`;
  }

  _renderEvent(ev, dayDs) {
    const summary = ev.summary||"", isDrive = this._isDrive(summary);
    const idx = (this._renderedEvents || this._events).indexOf(ev);
    const flagged = this._isFlagged(ev);
    // fr-2026-05-11-a: respect either the global flag OR the per-day
    // override. `dayDs` is the iso of the day section this row belongs
    // to (passed by _renderDay).
    if (flagged && !this._showFlagged && !(dayDs && this._perDayFlagged.has(dayDs))) return "";
    const isFlight = this._isFlight(summary), description = ev.description||"";
    let flightBadge = "";
    if (isFlight && description) { const m = description.match(/Flight:\s*(\S+)/); if (m) flightBadge = `<span class="flight-badge">✈ ${_esc(m[1])}</span>`; }
    // fr-2026-05-07-d: pending-proposal badge in parity with web. The
    // _pendingProposal annotation comes from the render-time fold of
    // this._pendingProposals (matchPendingProposal + ghost adds).
    const pending = ev._pendingProposal;
    let pendingTag = "", pendingClass = "", pendingStyle = "";
    if (pending) {
      const labels = {add: "REVIEW · NEW", update: "REVIEW · CHANGE",
                       remove: "REVIEW · DELETE", hide: "REVIEW · HIDE",
                       accept: "REVIEW · ACCEPT", merge: "REVIEW · MERGE"};
      pendingTag = `<span class="pending-tag pending-${pending.kind}" title="Agent proposed — pending your review on the web schedule.">${labels[pending.kind] || "REVIEW"}</span>`;
      pendingClass = ` is-pending pending-${pending.kind}`;
      if (pending.kind === "remove") {
        pendingStyle = " text-decoration:line-through; opacity:0.75;";
      }
    }
    const flagStyle = flagged ? " opacity:0.4; text-decoration:line-through;" : "";
    const flaggedTag = flagged ? `<span class="flag-tag">${_esc(this._flaggedLabel(ev))}</span>` : "";
    const colorAttr = _esc(ev._color || "#888");
    return `<div class="event${isDrive?" is-drive":""}${pendingClass}" data-event-idx="${idx}" style="${flagStyle}${pendingStyle}"><div class="event-time">${this._formatTime(ev)}</div><div class="event-body"><div class="event-summary"><span class="person-dot" style="background:${colorAttr}"></span>${_esc(summary)} ${flightBadge}${pendingTag}${flaggedTag}</div>${ev.location?`<div class="event-location">${_esc(ev.location)}</div>`:""}</div></div>`;
  }

  _renderCalendarGrid(days, grouped) {
    const weeks = [], firstDate = new Date(days[0]+"T12:00:00");
    const jsDay = firstDate.getDay(), padBefore = jsDay===0?6:jsDay-1;
    const allDays = [];
    for (let i=padBefore;i>0;i--){const d=new Date(firstDate);d.setDate(d.getDate()-i);allDays.push({ds:this._fmt(d),outside:true});}
    for (const ds of days) allDays.push({ds,outside:false});
    while(allDays.length%7!==0){const last=new Date(allDays[allDays.length-1].ds+"T12:00:00");last.setDate(last.getDate()+1);allDays.push({ds:this._fmt(last),outside:true});}
    for(let i=0;i<allDays.length;i+=7)weeks.push(allDays.slice(i,i+7));
    return `<div class="cal-grid"><div class="cal-header-row">${DAY_SHORT_MON.map(d=>`<div class="cal-header-cell">${d}</div>`).join("")}</div>${weeks.map(week=>`<div class="cal-week">${week.map(({ds,outside})=>{const isToday=this._isToday(ds),d=new Date(ds+"T12:00:00"),evts=grouped[ds]||[],isWeekend=d.getDay()===0||d.getDay()===6;let cls="cal-day";if(isToday)cls+=" cal-today";if(outside)cls+=" cal-outside";if(isWeekend)cls+=" cal-weekend";if(ds<this._todayStr()&&!outside)cls+=" cal-past";return`<div class="${cls}" data-day-date="${_esc(ds)}" style="cursor:pointer"><div class="cal-date">${d.getDate()}</div><div class="cal-events">${evts.filter(ev=>this._showFlagged||!this._isFlagged(ev)).map(ev=>{const isDrive=this._isDrive(ev.summary||"");const fl=this._isFlagged(ev);const c=_esc(ev._color||"#888");
    // fr-2026-05-07-d: pending events in the calendar grid get a
    // dashed border + amber background (no room for a text pill).
    // The "⚠" prefix in the title flags review state at a glance.
    const pendingKind = ev._pendingProposal?.kind || "";
    const pendingCls = pendingKind ? ` cal-pending cal-pending-${pendingKind}` : "";
    const pendingPrefix = pendingKind ? "⚠ " : "";
    return`<div class="cal-event${isDrive?" cal-drive":""}${pendingCls}" style="border-left:3px solid ${c}${fl?";opacity:0.4;text-decoration:line-through":""}"><span class="cal-event-time">${this._formatTimeShort(ev)}</span><span class="cal-event-text">${pendingPrefix}${_esc(ev.summary||"")}</span></div>`;}).join("")}</div></div>`;}).join("")}</div>`).join("")}</div>`;
  }

  // ====================== STYLES ======================

  _resolveTheme(name) {
    // Merge theme with defaults so every theme is fully populated. fontDisplay
    // falls back to font, eventTextStrong/Soft to text/muted.
    const key = name || this._theme;
    const raw = THEMES[key] || THEMES.dark;
    const t = { ...THEME_DEFAULTS, ...raw };
    if (!t.fontDisplay) t.fontDisplay = t.font;
    if (!t.eventTextStrong) t.eventTextStrong = t.headerText || t.text;
    if (!t.eventTextSoft) t.eventTextSoft = t.muted;
    t._d = DENSITY[t.density] || DENSITY.regular;
    return t;
  }

  /** All themable values exposed as CSS custom properties. Returned as a
   *  semicolon-joined declaration string suitable for either `:host {...}`
   *  or an inline `style="..."` attribute. Per-panel themes work by emitting
   *  this string into the panel root's inline style — descendants reading
   *  `var(--xxx)` pick up the override automatically. */
  _themeVars(name) {
    const t = this._resolveTheme(name);
    const d = t._d;
    const radiusPill      = t.radius === "0" ? "0" : "20px";
    const radiusPillInner = t.radius === "0" ? "0" : "16px";
    const calHeaderLs     = t.dayHeaderLetterSpacing === "0" ? "0.5px" : t.dayHeaderLetterSpacing;
    return [
      `--card-bg: ${t.cardBg}`,
      `--text: ${t.text}`,
      `--muted: ${t.muted}`,
      `--border: ${t.border}`,
      `--today-bg: ${t.todayBg}`,
      `--accent: ${t.accent}`,
      `--accent-bg: ${t.accentBg}`,
      `--header-text: ${t.headerText}`,
      `--event-hover: ${t.eventHover}`,
      `--cal-day-bg: ${t.calDayBg}`,
      `--cal-today-bg: ${t.calTodayBg}`,
      `--weekend-bg: ${t.weekendBg}`,
      `--modal-bg: ${t.modalBg}`,
      `--modal-text: ${t.modalText}`,
      `--card-shadow: ${t.cardShadow}`,
      `--modal-shadow: ${t.modalShadow}`,
      `--font: ${t.font}`,
      `--font-display: ${t.fontDisplay}`,
      `--title-size: ${t.titleSize}`,
      `--title-weight: ${t.titleWeight}`,
      `--title-transform: ${t.titleTransform}`,
      `--title-letter-spacing: ${t.titleLetterSpacing}`,
      `--day-header-size: ${t.dayHeaderSize}`,
      `--day-header-weight: ${t.dayHeaderWeight}`,
      `--day-header-transform: ${t.dayHeaderTransform}`,
      `--day-header-letter-spacing: ${t.dayHeaderLetterSpacing}`,
      `--cal-header-letter-spacing: ${calHeaderLs}`,
      `--today-header-size: ${t.todayHeaderSize}`,
      `--event-summary-size: ${t.eventSummarySize}`,
      `--event-summary-weight: ${t.eventSummaryWeight}`,
      `--event-time-size: ${t.eventTimeSize}`,
      `--radius: ${t.radius}`,
      `--radius-sm: ${t.radiusSm}`,
      `--radius-xs: ${t.radiusXs}`,
      `--radius-pill: ${radiusPill}`,
      `--radius-pill-inner: ${radiusPillInner}`,
      `--text-strong: ${t.eventTextStrong}`,
      `--text-soft: ${t.eventTextSoft}`,
      `--card-pad: ${d.cardPad}`,
      `--day-pad: ${d.dayPad}`,
      `--event-pad-v: ${d.eventPadV}`,
      `--event-pad-h: ${d.eventPadH}`,
      `--event-gap: ${d.eventGap}`,
      `--event-cols: ${d.eventCols}`,
      `--day-header-pad: ${d.dayHeaderPad}`,
      `--day-spacing: ${d.daySpacing}`,
      `--cal-pad: ${d.calPad}`,
      `--cal-min: ${d.calMin}`,
      `--overview-min: ${d.overviewMin}`,
      `--header-gap: ${d.headerGap}`,
    ].join("; ");
  }

  _getStyles() {
    const t = this._resolveTheme();
    return `
      :host { display: block; font-family: var(--font); color: var(--text); ${this._themeVars(this._theme)}; }
      .card { background: var(--card-bg); border-radius: var(--radius); overflow: hidden; position: relative; box-shadow: var(--card-shadow); }
      .card-locked { border-radius: var(--radius-sm); }
      /* Seam mode — when adjacent cards abut, flatten the touching corners
         and drop the shadow so the cards visually butt together. */
      .card.seam-left  { border-top-left-radius: 0;  border-bottom-left-radius: 0;  }
      .card.seam-right { border-top-right-radius: 0; border-bottom-right-radius: 0; }
      .card.seam-top   { border-top-left-radius: 0;  border-top-right-radius: 0;    }
      .card.seam-bottom{ border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
      .card.seam-left, .card.seam-right, .card.seam-top, .card.seam-bottom { box-shadow: none; }

      /* Per-panel theming: any element with [data-panel] applies its own theme
         scope via inline-style CSS variables. Children re-read var(--font) so
         the override propagates. */
      [data-panel] { font-family: var(--font); color: var(--text); background: var(--card-bg); }

      .header { display: flex; align-items: center; justify-content: space-between; padding: var(--card-pad); border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: var(--header-gap); }
      .header .title { font-family: var(--font-display); font-size: var(--title-size); font-weight: var(--title-weight); letter-spacing: var(--title-letter-spacing); text-transform: var(--title-transform); color: var(--header-text); line-height: 1.1; }
      .header .meta { display: flex; gap: 16px; align-items: center; font-size: 14px; color: var(--muted); }
      .header .badge { background: #E0A020; color: #1e1e2e; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: var(--radius-sm); }
      .header .version { font-size: 11px; color: var(--muted); opacity: 0.5; }
      .view-toggle { display: flex; background: var(--accent-bg); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 3px; }
      .toggle-btn { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 8px 16px; border-radius: var(--radius-pill-inner); font-family: var(--font); font-size: 13px; font-weight: 600; transition: all 0.15s; }
      .toggle-btn.active { background: var(--accent); color: var(--card-bg); }
      .toggle-btn:hover:not(.active) { color: var(--header-text); opacity: 0.7; }
      .theme-btn { background: transparent; border: 1px solid var(--border); color: var(--muted);
        cursor: pointer; padding: 4px 10px; border-radius: var(--radius-sm); font-family: var(--font); font-size: 11px; font-weight: 600;
        transition: all 0.15s; }
      .theme-btn:hover { color: var(--header-text); border-color: var(--accent); }
      .flagged-btn { background: transparent; border: 1px solid var(--border); color: var(--muted);
        cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); font-size: 11px; transition: all 0.15s; }
      .flagged-btn:hover { border-color: var(--accent); }
      .flagged-btn.active { background: rgba(255,100,100,0.15); color: #FF6B6B; border-color: #FF6B6B; }
      /* fr-2026-05-11-a: per-day 🗑 button inside .day-header — smaller
         + less prominent than the global one, but uses the same active
         colors so the affordance is consistent. */
      .day-flagged-btn { background: transparent; border: 1px solid transparent;
        color: var(--muted); cursor: pointer; padding: 1px 5px;
        border-radius: var(--radius-sm); font-size: 10px; margin-left: 6px;
        opacity: 0.55; transition: all 0.15s; vertical-align: middle; }
      .day-flagged-btn:hover { opacity: 1; border-color: var(--border); }
      .day-flagged-btn.active { background: rgba(255,100,100,0.15);
        color: #FF6B6B; border-color: #FF6B6B; opacity: 1; }
      .floating-theme { position: absolute; top: 6px; right: 6px; z-index: 5; display: flex; gap: 4px; }
      .overview-top { display: grid; grid-template-columns: 3fr 2fr; gap: 0; border-bottom: 1px solid var(--border); min-height: var(--overview-min); }
      .overview-col:first-child { border-right: 1px solid var(--border); border-left: 4px solid var(--accent); background: var(--accent-bg); }
      /* Day View — two rows × two columns. Each row has list (left)
         and hour-axis (right). Hour-axis hidden on narrow displays
         (HA dashboards on phones) since the wall-display is the
         primary surface for Day View. */
      .dayview-stack { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
      /* Right column = 60% of its previous share: was 3fr/2fr
         (60%/40%); now the grid column shrinks to 0.6×40% = 24% of
         the row, leaving 76% for the list. 19fr/6fr ≈ 76%/24%. */
      .dayview-row { display: grid; grid-template-columns: 19fr 6fr; gap: 0;
                      border: 1px solid var(--border); border-radius: var(--radius);
                      overflow: hidden; }
      .dayview-col-list { border-right: 1px solid var(--border); }
      .dayview-col-grid { background: var(--card-bg); }
      @media (max-width: 720px) {
        .dayview-row { grid-template-columns: 1fr; }
        .dayview-col-list { border-right: none; }
        .dayview-col-grid { display: none; }
      }
      .dv-grid { padding: 4px 6px; }
      .dv-canvas {
        position: relative;
        /* 1px hour-line at the START of each --hour-px period. The
           previous version put the line at --hour-px..--hour-px+1px,
           silently making the period 41px and drifting 1px/hr from
           the labels (visible in screenshots as misaligned grid
           lines after a few hours). Putting it at the start makes
           the period exactly --hour-px. */
        background-image: repeating-linear-gradient(
          to bottom,
          rgba(127,127,127,0.18) 0,
          rgba(127,127,127,0.18) 1px,
          transparent 1px,
          transparent var(--hour-px, 32px)
        );
      }
      .dv-hours { position: absolute; left: 0; top: 0; width: 44px;
                  height: 100%; pointer-events: none;
                  border-right: 1px solid var(--border); }
      .dv-hour-lbl { position: absolute; left: 0; right: 4px;
                     transform: translateY(-50%);
                     font-size: 10px; color: var(--muted);
                     text-align: right; font-variant-numeric: tabular-nums; }
      .dv-event { position: absolute; left: calc(44px + 4px);
                  right: 4px; box-sizing: border-box;
                  padding: 3px 6px; border-radius: var(--radius-xs);
                  overflow: hidden; cursor: pointer;
                  background: var(--event-hover); color: var(--text-strong);
                  font-size: 11.5px; line-height: 1.25; }
      .dv-event:hover { filter: brightness(1.05); }
      .dv-event.is-compact { padding: 1px 6px; }
      .dv-event.is-compact .dv-ev-time { font-size: 9.5px; }
      .dv-event.is-compact .dv-ev-what { font-size: 10.5px;
                                          white-space: nowrap;
                                          text-overflow: ellipsis; overflow: hidden; }
      .dv-event.is-compact .dv-ev-where { display: none; }
      .dv-event.is-flagged { opacity: 0.4; text-decoration: line-through; }
      .dv-event.is-drive { font-style: italic; opacity: 0.85; }
      .dv-event.is-pending {
        border: 1.5px dashed #946B1F; background: rgba(224,160,32,0.18);
      }
      .dv-ev-time { font-size: 10px; color: var(--muted);
                    font-variant-numeric: tabular-nums; font-weight: 600;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dv-ev-what { font-size: 12px; font-weight: 600;
                    overflow: hidden; text-overflow: ellipsis;
                    display: -webkit-box; -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical; }
      .dv-ev-where { font-size: 10.5px; color: var(--muted);
                     white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      /* NOW line — red rule + dot. JS positions on render; the minute
         ticker re-renders the card so the line creeps. */
      .dv-now { position: absolute; left: 44px; right: 0; height: 2px;
                background: #D03030; z-index: 2; pointer-events: none;
                box-shadow: 0 0 0 1px rgba(208,48,48,0.18); }
      .dv-now::before { content: ""; position: absolute;
                        left: -5px; top: -4px;
                        width: 10px; height: 10px;
                        background: #D03030; border-radius: 50%; }
      .days { padding: 8px 0; }
      .day { padding: var(--day-pad); margin-bottom: var(--day-spacing); }
      .day-header { display: flex; align-items: center; gap: 10px; padding: var(--day-header-pad); font-family: var(--font-display); font-weight: var(--day-header-weight); font-size: var(--day-header-size); text-transform: var(--day-header-transform); letter-spacing: var(--day-header-letter-spacing); color: var(--muted); border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card-bg); z-index: 2; }
      .day.is-today .day-header { color: var(--header-text); font-size: var(--today-header-size); }
      .day.is-tomorrow .day-header { color: var(--text-soft); font-size: calc(var(--day-header-size) + 3px); }
      .day.is-today { background: var(--today-bg); border-radius: var(--radius-sm); padding-top: 8px; padding-bottom: 12px; margin-bottom: 8px; }
      .day-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
      .day.is-today .day-dot { background: var(--accent); width: 10px; height: 10px; }
      .day.is-tomorrow .day-dot { background: var(--accent); opacity: 0.6; }
      .event-count { font-size: 13px; color: var(--muted); font-weight: 400; text-transform: none; letter-spacing: 0; }
      .events { padding: 4px 0; }
      .event { display: grid; grid-template-columns: var(--event-cols); gap: var(--event-gap); padding: var(--event-pad-v) var(--event-pad-h); border-bottom: 1px solid var(--border); align-items: start; cursor: pointer; border-radius: var(--radius-sm); }
      .event:hover { background: var(--event-hover); }
      .event:last-child { border-bottom: none; }
      .event-time { font-family: var(--font); font-size: var(--event-time-size); font-variant-numeric: tabular-nums; color: var(--muted); text-align: right; }
      .day.is-today .event-time { font-size: calc(var(--event-time-size) + 3px); color: var(--text-soft); }
      .event-body { min-width: 0; }
      .event-summary { font-family: var(--font); font-size: var(--event-summary-size); font-weight: var(--event-summary-weight); color: var(--text-strong); display: flex; align-items: center; gap: 8px; line-height: 1.3; flex-wrap: wrap; }
      .day.is-today .event-summary { font-size: calc(var(--event-summary-size) + 3px); color: var(--header-text); }
      .event-summary .person-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .event-location { font-size: 14px; color: var(--muted); margin-top: 2px; }
      .event.is-drive .event-summary { font-style: italic; color: var(--muted); font-weight: 400; }
      .event.is-drive .event-time { color: var(--muted); opacity: 0.6; }
      .flight-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--accent-bg); color: var(--accent); font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: var(--radius-sm); }
      .flag-tag { display: inline-flex; align-items: center; background: rgba(255,100,100,0.15); color: #FF6B6B; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-sm); text-decoration: none; }
      /* fr-2026-05-07-d: pending-proposal badge in parity with web.
         Amber for add/update (needs review), red for remove (would
         delete). Dashed border on the row + amber tint signals "agent
         proposed, not yet committed" without confusing the Calendar's
         per-person color coding. */
      .pending-tag { display: inline-flex; align-items: center; background: rgba(224,160,32,0.18); color: #E0A020; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-sm); text-decoration: none; letter-spacing: 0.3px; }
      .pending-tag.pending-remove { background: rgba(200,64,30,0.18); color: #C8401E; }
      .event.is-pending { border-left: 3px dashed #E0A020; padding-left: calc(var(--event-pad-h) - 3px); background: rgba(224,160,32,0.06); }
      .event.is-pending.pending-remove { border-left-color: #C8401E; background: rgba(200,64,30,0.06); }
      .no-events { padding: 8px 4px; font-size: 15px; color: var(--muted); opacity: 0.5; font-style: italic; }
      .weekend .day-header { color: var(--muted); opacity: 0.85; }
      .cal-grid { padding: var(--cal-pad); }
      .cal-header-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 4px; }
      .cal-header-cell { font-family: var(--font-display); text-align: center; font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: var(--cal-header-letter-spacing); padding: 4px 0; border-bottom: 1px solid var(--border); }
      .cal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 3px; align-items: stretch; }
      .cal-day { background: var(--cal-day-bg); border-radius: var(--radius-xs); padding: 4px; min-height: var(--cal-min); overflow: hidden; }
      .cal-today { background: var(--cal-today-bg); outline: 2px solid var(--accent); outline-offset: -2px; }
      .cal-outside { opacity: 0.25; }
      .cal-past { opacity: 0.35; }
      .cal-weekend { background: var(--weekend-bg); }
      .cal-date { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--muted); margin-bottom: 3px; }
      .cal-today .cal-date { color: var(--accent); font-size: 15px; }
      .cal-events { display: flex; flex-direction: column; gap: 1px; }
      .cal-event { padding: 2px 4px; border-radius: var(--radius-xs); background: var(--event-hover); font-size: 11px; line-height: 1.25; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: flex; gap: 3px; align-items: baseline; }
      .cal-event-time { color: var(--muted); font-size: 10px; font-variant-numeric: tabular-nums; flex-shrink: 0; }
      .cal-event-text { overflow: hidden; text-overflow: ellipsis; color: var(--text-strong); font-size: 11px; }
      .cal-drive { opacity: 0.5; font-style: italic; }
      /* fr-2026-05-07-d: pending-proposal styling on the cal grid.
         Border-left already encodes the per-person color, so the
         pending state is signalled via a dashed RIGHT edge + amber
         background tint. The ⚠ prefix on .cal-event-text flags it
         even when a glance misses the dashed edge. */
      .cal-event.cal-pending { background: rgba(224,160,32,0.18); border-right: 2px dashed #E0A020; padding-right: 2px; }
      .cal-event.cal-pending-remove { background: rgba(200,64,30,0.18); border-right-color: #C8401E; text-decoration: line-through; opacity: 0.85; }

      /* Modal */
      .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; }
      .modal { background: var(--modal-bg); color: var(--modal-text); border-radius: var(--radius); width: min(520px, 90vw); max-height: 85vh; overflow-y: auto; box-shadow: var(--modal-shadow); font-family: var(--font); }
      .modal-header { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border); }
      .modal-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
      .modal-title { font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--text-strong); flex: 1; }
      .modal-close { background: transparent; border: none; color: var(--muted); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); }
      .modal-close:hover { background: var(--event-hover); color: var(--text-strong); }
      .modal-body { padding: 16px 20px; }
      .modal-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 15px; line-height: 1.4; }
      .modal-row:last-child { border-bottom: none; }
      .modal-label { color: var(--muted); font-size: 13px; font-weight: 600; text-transform: uppercase; min-width: 60px; padding-top: 2px; }
      .modal-desc { font-size: 13px; color: var(--muted); line-height: 1.4; }

      /* fr-2026-05-11-b: review modal — duplicates the web /review
         page so the user can apply/reject pending proposals + accept/
         hide calendar NEW/CHANGED rows from HA. Wider than the event-
         detail modal because each item is a stacked row + actions. */
      .review-modal { width: min(720px, 95vw); }
      .review-body { padding: 12px 16px 18px; }
      .review-loading, .review-empty, .review-error {
        text-align: center; padding: 32px 16px; color: var(--muted); }
      .review-error { color: #FF6B6B; }
      /* Inline banners above the queue (fallback warning + action
         error). Different from .review-error which takes over the
         whole body — these keep the queue visible underneath. */
      .review-banner { padding: 8px 12px; border-radius: var(--radius-sm);
        font-size: 13px; line-height: 1.4; margin-bottom: 10px; }
      .review-banner-warn { background: rgba(255,210,0,0.10);
        border: 1px solid rgba(255,210,0,0.4); color: var(--text-strong); }
      .review-banner-err { background: rgba(255,107,107,0.10);
        border: 1px solid rgba(255,107,107,0.4); color: #FF6B6B; }
      .review-bulkbar { display: flex; flex-wrap: wrap; gap: 6px;
        padding: 8px 0 12px; border-bottom: 1px solid var(--border);
        margin-bottom: 12px; }
      .review-btn-bulk { padding: 6px 10px; font-size: 12px;
        font-weight: 600; border-radius: var(--radius-sm); border: 1px solid var(--border);
        background: transparent; cursor: pointer; color: var(--text-soft); }
      .review-btn-bulk.accept { border-color: #4CAF50; color: #4CAF50; }
      .review-btn-bulk.reject, .review-btn-bulk.hide {
        border-color: #FF6B6B; color: #FF6B6B; }
      .review-btn-bulk:hover { filter: brightness(1.2); }
      .review-btn-bulk:disabled { opacity: 0.4; cursor: not-allowed; }
      .review-section { margin-bottom: 14px; }
      .review-section-title { font-size: 12px; text-transform: uppercase;
        letter-spacing: 0.05em; color: var(--muted); margin: 8px 0 6px;
        font-weight: 600; }
      .review-batch { display: flex; flex-wrap: wrap; gap: 10px;
        align-items: center; padding: 10px 12px; margin-bottom: 6px;
        border: 1px solid var(--border); border-radius: var(--radius-sm);
        background: rgba(255,210,0,0.05); }
      .review-batch-summary { flex: 1; font-size: 13px; line-height: 1.4; }
      .review-batch-dates { font-size: 11px; color: var(--muted);
        display: block; margin-top: 2px; }
      .review-group { border: 1px solid var(--border);
        border-radius: var(--radius-sm); margin-bottom: 8px; overflow: hidden; }
      .review-item { display: flex; gap: 10px; align-items: flex-start;
        padding: 10px 12px; }
      .review-item + .review-item { border-top: 1px dashed var(--border); }
      .review-item-calendar { background: rgba(80,160,255,0.04); }
      .review-item-proposal { background: rgba(255,210,0,0.04); }
      .review-status-new .review-item-tag { color: #4CAF50; }
      .review-status-changed .review-item-tag { color: #FF9800; }
      .review-status-orphan .review-item-tag { color: #FF6B6B; }
      .review-status-conflict .review-item-tag { color: #FF3030; }
      .review-tag-agent { color: #E0A020; }
      .review-item-tag { font-size: 10px; font-weight: 700;
        letter-spacing: 0.04em; min-width: 56px; padding-top: 3px; }
      .review-item-main { flex: 1; font-size: 14px; line-height: 1.4; }
      .review-item-line { color: var(--text-strong); }
      .review-item-meta { font-size: 11px; color: var(--muted);
        margin-top: 2px; }
      .review-actions { display: flex; gap: 6px; }
      .review-btn { padding: 5px 10px; border-radius: var(--radius-sm);
        border: 1px solid var(--border); background: transparent;
        font-size: 12px; font-weight: 600; cursor: pointer;
        color: var(--text-soft); }
      .review-btn.accept { color: #4CAF50; border-color: #4CAF50; }
      .review-btn.reject, .review-btn.hide {
        color: #FF6B6B; border-color: #FF6B6B; }
      .review-btn:hover { filter: brightness(1.2); }
      .review-btn:disabled { opacity: 0.4; cursor: wait; }
      /* The pending pill becomes a button on the header (tap → opens
         the review modal). Keep the badge look. */
      .pending-pill { background: #FFD200; color: #0A0A0A;
        border: 2px solid #0A0A0A; border-radius: 0; padding: 4px 12px;
        font-weight: 700; font-size: 13px; cursor: pointer;
        font-family: var(--font); }
      .pending-pill:hover { filter: brightness(1.05); }
      /* Inline review bar on the event-detail modal (fr-2026-05-11-b). */
      .inline-review-bar { display: flex; align-items: center; gap: 8px;
        margin: 10px 0; padding: 8px 10px; border-radius: var(--radius-sm);
        background: rgba(255,210,0,0.07); border: 1px solid rgba(255,210,0,0.3); }
      .inline-review-label { flex: 1; font-size: 12px; color: var(--muted);
        font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

      /* Recheck */
      .recheck-btn { display: block; width: 100%; margin-top: 14px; padding: 12px; border: none; border-radius: var(--radius-sm); background: var(--accent-bg); color: var(--accent); font-family: var(--font); font-size: 15px; font-weight: 600; cursor: pointer; }
      .skip-week-btn { display: block; width: 100%; margin-top: 12px; padding: 12px; border: 1px solid #E08890; border-radius: var(--radius-sm); background: rgba(255,199,206,0.15); color: #E08890; font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer; }
      .skip-week-btn:hover { background: rgba(255,199,206,0.25); }
      .skip-week-btn:disabled { opacity: 0.5; cursor: wait; }
      .recheck-btn:hover { filter: brightness(1.15); }
      .recheck-btn:disabled { opacity: 0.5; cursor: wait; }

      .origin-picker { margin-top: 14px; }
      .origin-label { font-size: 14px; font-weight: 600; color: var(--text-soft); margin-bottom: 8px; }
      .origin-buttons { display: flex; gap: 8px; margin-bottom: 6px; }
      .origin-btn { flex: 1; padding: 12px; border: 2px solid var(--border); border-radius: var(--radius-sm); background: transparent; font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer; color: var(--accent); }
      .origin-btn:hover { border-color: var(--accent); background: var(--accent-bg); }
      .origin-btn:disabled { opacity: 0.5; cursor: wait; }
      .origin-hint { font-size: 11px; color: var(--muted); }

      .recheck-result { margin-top: 12px; padding: 14px; border-radius: var(--radius-sm); font-size: 14px; line-height: 1.5; }
      .recheck-result.ok { background: var(--accent-bg); color: var(--accent); }
      .recheck-result.err { background: rgba(255,100,100,0.1); color: #FF6B6B; }
      .recheck-route { font-size: 13px; margin-bottom: 3px; color: var(--text-soft); }
      .recheck-label { color: var(--muted); font-weight: 600; font-size: 11px; text-transform: uppercase; margin-right: 4px; }
      .recheck-duration { margin-top: 8px; font-size: 18px; }
      .recheck-pessimistic { font-size: 13px; color: var(--muted); }
      .recheck-via { font-size: 12px; color: var(--muted); margin-top: 4px; }
      .recheck-arrive { margin-bottom: 8px; padding: 8px 10px; border-radius: var(--radius-sm);
                        background: rgba(46,139,87,0.12); color: #2E8B57; font-size: 14px; }
      .recheck-late   { margin-bottom: 8px; padding: 8px 10px; border-radius: var(--radius-sm);
                        background: rgba(255,100,100,0.15); color: #B04030; font-size: 13px; }
      .traffic-ok { margin-top: 6px; font-size: 13px; color: var(--accent); }
      .traffic-warn { margin-top: 6px; font-size: 13px; color: #FF6B6B; background: rgba(255,100,100,0.1); padding: 8px; border-radius: var(--radius-sm); }
      .traffic-meta { font-size: 11px; opacity: 0.7; }

      .action-btn { display: block; width: 100%; margin-top: 10px; padding: 12px; border: none; border-radius: var(--radius-sm); font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer; }
      .action-btn:disabled { opacity: 0.5; cursor: wait; }
      .action-btn.action-update { background: #2E8B57; color: white; }
      .action-btn.action-update:hover { background: #1F6B41; }
      .action-btn.action-add-drive { background: var(--accent-bg); color: var(--accent); }
      .action-btn.action-add-drive:hover { filter: brightness(1.15); }

      .action-result { margin-top: 10px; padding: 12px; border-radius: var(--radius-sm); font-size: 13px; line-height: 1.4; }
      .action-result.ok { background: rgba(46,139,87,0.15); color: var(--accent); }
      .action-result.err { background: rgba(255,100,100,0.1); color: #FF6B6B; }

      /* Per-theme escape hatch — appended last so it overrides any of the above.
         Lives at card scope only; per-panel customCss is not supported. */
      ${t.customCss || ""}
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


// ====================== VISUAL CONFIG EDITOR ======================

class KatjaScheduleCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _fire(config) {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  _update(key, value) {
    const c = { ...this._config };
    if (value === "" || value === undefined) delete c[key];
    else c[key] = value;
    this._config = c;
    this._fire(c);
    this._render();
  }

  _updateNested(parent, key, value) {
    const c = { ...this._config };
    c[parent] = { ...(c[parent] || {}) };
    if (value === "") delete c[parent][key];
    else c[parent][key] = value;
    this._config = c;
    this._fire(c);
    this._render();
  }

  _addCalendar() {
    const c = { ...this._config };
    c.calendars = [...(c.calendars || []), { entity: "", color: "#888888", label: "" }];
    this._config = c;
    this._fire(c);
    this._render();
  }

  _removeCalendar(idx) {
    const c = { ...this._config };
    c.calendars = [...(c.calendars || [])];
    c.calendars.splice(idx, 1);
    this._config = c;
    this._fire(c);
    this._render();
  }

  _updateCalendar(idx, field, value) {
    const c = { ...this._config };
    c.calendars = [...(c.calendars || [])];
    c.calendars[idx] = { ...c.calendars[idx], [field]: value };
    this._config = c;
    this._fire(c);
  }

  _render() {
    const c = this._config;
    const calendars = c.calendars || [];
    const calEntities = this._hass
      ? Object.keys(this._hass.states).filter(e => e.startsWith("calendar.")).sort()
      : [];
    const sensorEntities = this._hass
      ? Object.keys(this._hass.states).filter(e => e.startsWith("sensor.")).sort()
      : [];

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: system-ui, sans-serif; }
        .row { margin-bottom: 12px; }
        label { display: block; font-size: 12px; font-weight: 600; color: #888; margin-bottom: 4px; text-transform: uppercase; }
        input, select { width: 100%; padding: 8px; border: 1px solid #444; border-radius: 6px; background: #2a2a3e; color: #e0e0e0; font-size: 14px; box-sizing: border-box; }
        input:focus, select:focus { outline: none; border-color: #4ECDC4; }
        .toggle-row { display: flex; align-items: center; gap: 10px; }
        .toggle-row input[type="checkbox"] { width: auto; }
        .seam-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .seam-chk { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #ccc; text-transform: capitalize; cursor: pointer; }
        .seam-chk input { width: auto; }
        .cal-item { display: grid; grid-template-columns: 1fr 80px 80px 32px; gap: 6px; align-items: center; margin-bottom: 6px; }
        .cal-item input { font-size: 12px; padding: 6px; }
        .cal-item select { font-size: 12px; padding: 6px; }
        .remove-btn { background: #8B2E2E; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; padding: 4px 8px; }
        .remove-btn:hover { background: #B03018; }
        .add-btn { background: #2E8B57; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; padding: 8px 16px; font-weight: 600; }
        .add-btn:hover { background: #1F6B41; }
        h3 { font-size: 14px; color: #aaa; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #333; }
      </style>

      <div class="row">
        <label>Title</label>
        <input type="text" value="${c.title || "Family Schedule"}" id="inp-title">
      </div>

      <div class="row">
        <label>Theme</label>
        <select id="sel-theme">
          ${Object.entries(THEMES).map(([k, v]) =>
            `<option value="${k}" ${(c.theme || "dark") === k ? "selected" : ""}>${v.name}</option>`
          ).join("")}
        </select>
      </div>

      <div class="row">
        <label>View (leave empty for full card with toggle)</label>
        <select id="sel-view">
          <option value="" ${!c.view ? "selected" : ""}>Full card (Overview + toggle)</option>
          <option value="overview" ${c.view === "overview" ? "selected" : ""}>Overview only</option>
          <option value="dayview" ${c.view === "dayview" ? "selected" : ""}>Day View only (today + tomorrow with hour-grid)</option>
          <option value="dayview-today" ${c.view === "dayview-today" ? "selected" : ""}>Day View only (today with hour-grid)</option>
          <option value="today" ${c.view === "today" ? "selected" : ""}>Today only</option>
          <option value="tomorrow" ${c.view === "tomorrow" ? "selected" : ""}>Tomorrow only</option>
          <option value="calendar" ${c.view === "calendar" ? "selected" : ""}>Calendar grid only</option>
          <option value="schedule" ${c.view === "schedule" ? "selected" : ""}>Schedule (Cards) only</option>
        </select>
      </div>

      <div class="row toggle-row">
        <input type="checkbox" id="chk-theme-toggle" ${c.show_theme_toggle ? "checked" : ""}>
        <label style="display:inline;margin:0">Show theme toggle button</label>
      </div>

      <h3>Per-panel themes (Overview view)</h3>
      <p style="font-size:11px;color:#888;margin:0 0 10px">
        In Overview, today / tomorrow / calendar each get their own region.
        Set a different theme on any panel to override the card's main theme.
        Leave at "(inherit)" to use the card theme.
      </p>
      ${["today","tomorrow","calendar"].map(panel => {
        const cur = (c.panel_themes && c.panel_themes[panel]) || "";
        return `<div class="row">
          <label style="text-transform:capitalize">${panel}</label>
          <select data-panel-theme="${panel}">
            <option value="" ${!cur ? "selected" : ""}>(inherit card theme)</option>
            ${Object.entries(THEMES).map(([k, v]) =>
              `<option value="${k}" ${cur === k ? "selected" : ""}>${v.name}</option>`
            ).join("")}
          </select>
        </div>`;
      }).join("")}

      <div class="row">
        <label>Seam — flatten the touching edges so this card butts against neighbors</label>
        <p style="font-size:11px;color:#888;margin:0 0 6px">
          Tick the side(s) where another card sits. Pair with a
          <code>horizontal-stack</code> / <code>vertical-stack</code> wrapper
          to also remove HA's grid gap. Leave empty for a free-standing card.
        </p>
        <div class="seam-row">
          ${["left","right","top","bottom"].map(side => {
            const set = new Set((Array.isArray(c.seam) ? c.seam : String(c.seam || "").split(/[,\s]+/))
              .map(s => String(s).trim().toLowerCase()).filter(Boolean));
            return `<label class="seam-chk"><input type="checkbox" data-seam="${side}" ${set.has(side) ? "checked" : ""}> ${side}</label>`;
          }).join("")}
        </div>
      </div>

      <h3>Calendars</h3>
      <p style="font-size:12px;color:#888;margin:0 0 10px">
        v0.12+ ships a single <code>calendar.schedule</code> entity that
        contains every event. Color comes from each event's <code>Who:</code>
        line — leave the per-row color as a fallback. Older per-person
        entities still work.
      </p>
      ${calendars.map((cal, i) => `
        <div class="cal-item">
          <select data-cal-idx="${i}" data-cal-field="entity">
            <option value="">Select calendar...</option>
            ${calEntities.map(e => `<option value="${e}" ${cal.entity === e ? "selected" : ""}>${e.replace("calendar.", "")}</option>`).join("")}
          </select>
          <input type="color" value="${cal.color || "#888888"}" data-cal-idx="${i}" data-cal-field="color">
          <input type="text" placeholder="Label" value="${cal.label || ""}" data-cal-idx="${i}" data-cal-field="label">
          <button class="remove-btn" data-remove-idx="${i}">✕</button>
        </div>
      `).join("")}
      <button class="add-btn" id="btn-add-cal">+ Add calendar</button>

      <h3>Sensors</h3>
      <p style="font-size:12px;color:#888;margin:0 0 10px">
        These are created by the Katja Schedule integration. They show
        extra info in the card header. If you haven't set up the integration
        yet, leave these empty — the card works without them.
      </p>
      <div class="row">
        <label>Pending review — shows a badge when events need your attention</label>
        <select id="sel-sensor-pending">
          <option value="">None (no badge)</option>
          ${sensorEntities.map(e => `<option value="${e}" ${(c.sensors?.pending) === e ? "selected" : ""}>${e.replace("sensor.", "")}</option>`).join("")}
        </select>
      </div>
      <div class="row">
        <label>Last sync — shows when the schedule was last refreshed from Google Calendar</label>
        <select id="sel-sensor-sync">
          <option value="">None (no sync time)</option>
          ${sensorEntities.map(e => `<option value="${e}" ${(c.sensors?.sync) === e ? "selected" : ""}>${e.replace("sensor.", "")}</option>`).join("")}
        </select>
      </div>
    `;

    // Wire events
    this.shadowRoot.querySelector("#inp-title").addEventListener("change", e => this._update("title", e.target.value));
    this.shadowRoot.querySelector("#sel-theme").addEventListener("change", e => this._update("theme", e.target.value));
    this.shadowRoot.querySelector("#sel-view").addEventListener("change", e => this._update("view", e.target.value));
    this.shadowRoot.querySelector("#chk-theme-toggle").addEventListener("change", e => this._update("show_theme_toggle", e.target.checked));
    this.shadowRoot.querySelectorAll("[data-panel-theme]").forEach(sel => {
      sel.addEventListener("change", e => {
        this._updateNested("panel_themes", e.target.dataset.panelTheme, e.target.value);
      });
    });
    this.shadowRoot.querySelectorAll("[data-seam]").forEach(box => {
      box.addEventListener("change", () => {
        const sides = Array.from(this.shadowRoot.querySelectorAll("[data-seam]"))
          .filter(b => b.checked).map(b => b.dataset.seam);
        this._update("seam", sides.length ? sides.join(",") : "");
      });
    });
    this.shadowRoot.querySelector("#btn-add-cal").addEventListener("click", () => this._addCalendar());
    this.shadowRoot.querySelectorAll("[data-remove-idx]").forEach(btn =>
      btn.addEventListener("click", () => this._removeCalendar(parseInt(btn.dataset.removeIdx))));
    this.shadowRoot.querySelectorAll("[data-cal-idx]").forEach(el =>
      el.addEventListener("change", () => this._updateCalendar(parseInt(el.dataset.calIdx), el.dataset.calField, el.value)));
    this.shadowRoot.querySelector("#sel-sensor-pending").addEventListener("change", e => this._updateNested("sensors", "pending", e.target.value));
    this.shadowRoot.querySelector("#sel-sensor-sync").addEventListener("change", e => this._updateNested("sensors", "sync", e.target.value));
  }
}

customElements.define("katja-schedule-card-editor", KatjaScheduleCardEditor);
