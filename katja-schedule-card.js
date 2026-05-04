/**
 * Katja Schedule Card — custom Lovelace card for the Katja Schedule integration.
 *
 * Three views: Overview (default), Schedule, Calendar.
 * Tap event → detail modal with drive/flight recheck + action buttons.
 */

const CARD_VERSION = "0.28.0";

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
    this._dayDetailDate = null;
    this._theme = "dark";
    this._showFlagged = false;
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
    if (locked && ["today", "tomorrow", "calendar", "schedule", "overview"].includes(locked)) {
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
    this._render();
  }

  _parseEventMeta(description) {
    const out = {};
    if (!description) return out;
    for (const line of description.split(/\r?\n/)) {
      const m = line.match(/^\s*(\w+)\s*:\s*(.+)\s*$/);
      if (!m) continue;
      const k = m[1].toLowerCase();
      if (k === "who" || k === "status" || k === "where" || k === "flight" || k === "source") {
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
  _toggleFlagged() { this._showFlagged = !this._showFlagged; console.info("KATJA: toggled flagged to", this._showFlagged); this._render(); }
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
    } else if (this._view === "overview") {
      body = this._renderOverview(grouped);
    } else if (this._view === "schedule") {
      body = this._renderSchedule(grouped);
    } else {
      body = this._renderCalendarGrid(this._getMonAlignedDays(), grouped);
    }

    const modal = this._detailEvent ? this._renderDetailModal(this._detailEvent)
                : this._dayDetailDate ? this._renderDayDetailModal(this._dayDetailDate, grouped)
                : "";

    const showHeader = !locked || locked === "overview" || locked === "schedule";
    const showToggle = !locked;
    const showThemeBtn = this._showThemeToggle;

    const seamClasses = Array.from(this._seam).map(s => ` seam-${s}`).join("");
    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <ha-card><div class="card${locked ? " card-locked" : ""}${seamClasses}">
        ${showHeader ? `<div class="header">
          <span class="title">${this._config.title || "Family Schedule"}</span>
          ${showToggle ? `<div class="view-toggle">
            ${["overview","schedule","calendar"].map(v =>
              `<button class="toggle-btn ${this._view===v?"active":""}" data-view="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`
            ).join("")}
          </div>` : ""}
          <div class="meta">
            ${pendingCount > 0 ? `<span class="badge">${pendingCount} pending</span>` : ""}
            ${syncText ? `<span>Synced ${syncText}</span>` : ""}
            <span class="version">v${CARD_VERSION}${buildInfo ? ` · app ${buildInfo}` : ""}</span>
            ${this._showThemeToggle ? `<button class="theme-btn" id="theme-cycle">${THEMES[this._theme].name}</button>` : ""}
            <button class="flagged-btn${this._showFlagged ? " active" : ""}" id="flagged-toggle" title="${this._showFlagged ? "Hide" : "Show"} cancelled, skipped, and hidden events">🗑</button>
          </div>
        </div>` : ""}
        ${!showHeader ? `<div class="floating-theme">
          <button class="flagged-btn${this._showFlagged ? " active" : ""}" id="flagged-toggle" title="${this._showFlagged ? "Hide" : "Show"} cancelled, skipped, and hidden events">🗑</button>
          ${showThemeBtn ? `<button class="theme-btn" id="theme-cycle">${THEMES[this._theme].name}</button>` : ""}
        </div>` : ""}
        ${body}${modal}
      </div></ha-card>`;

    // Bind events
    this.shadowRoot.querySelectorAll(".toggle-btn").forEach(btn => btn.addEventListener("click", () => this._switchView(btn.dataset.view)));
    this.shadowRoot.querySelector("#theme-cycle")?.addEventListener("click", () => this._cycleTheme());
    this.shadowRoot.querySelectorAll("#flagged-toggle").forEach(btn => btn.addEventListener("click", (e) => { e.stopPropagation(); this._toggleFlagged(); }));
    this.shadowRoot.querySelectorAll("[data-event-idx]").forEach(el => el.addEventListener("click", () => this._openDetail(this._events[parseInt(el.dataset.eventIdx)])));
    this.shadowRoot.querySelector(".modal-close")?.addEventListener("click", () => {
      if (this._detailEvent) this._closeDetail();
      else if (this._dayDetailDate) this._closeDayDetail();
    });
    const backdrop = this.shadowRoot.querySelector(".modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        if (this._detailEvent) this._closeDetail();
        else if (this._dayDetailDate) this._closeDayDetail();
      }
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

  // ====================== DAY DETAIL MODAL ======================

  _renderDayDetailModal(ds, grouped) {
    const events = grouped[ds] || [];
    const dateLabel = this._formatDateHeader(ds);
    return `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-dot" style="background:#4ECDC4"></span>
            <span class="modal-title">${dateLabel}</span>
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
    const flagged = this._isFlagged(ev);
    if (flagged && !this._showFlagged) return "";
    const isFlight = this._isFlight(summary), description = ev.description||"";
    let flightBadge = "";
    if (isFlight && description) { const m = description.match(/Flight:\s*(\S+)/); if (m) flightBadge = `<span class="flight-badge">✈ ${m[1]}</span>`; }
    const flagStyle = flagged ? " opacity:0.4; text-decoration:line-through;" : "";
    const flaggedTag = flagged ? `<span class="flag-tag">${this._flaggedLabel(ev)}</span>` : "";
    return `<div class="event${isDrive?" is-drive":""}" data-event-idx="${idx}" style="${flagStyle}"><div class="event-time">${this._formatTime(ev)}</div><div class="event-body"><div class="event-summary"><span class="person-dot" style="background:${ev._color||"#888"}"></span>${summary} ${flightBadge}${flaggedTag}</div>${ev.location?`<div class="event-location">${ev.location}</div>`:""}</div></div>`;
  }

  _renderCalendarGrid(days, grouped) {
    const weeks = [], firstDate = new Date(days[0]+"T12:00:00");
    const jsDay = firstDate.getDay(), padBefore = jsDay===0?6:jsDay-1;
    const allDays = [];
    for (let i=padBefore;i>0;i--){const d=new Date(firstDate);d.setDate(d.getDate()-i);allDays.push({ds:this._fmt(d),outside:true});}
    for (const ds of days) allDays.push({ds,outside:false});
    while(allDays.length%7!==0){const last=new Date(allDays[allDays.length-1].ds+"T12:00:00");last.setDate(last.getDate()+1);allDays.push({ds:this._fmt(last),outside:true});}
    for(let i=0;i<allDays.length;i+=7)weeks.push(allDays.slice(i,i+7));
    return `<div class="cal-grid"><div class="cal-header-row">${DAY_SHORT_MON.map(d=>`<div class="cal-header-cell">${d}</div>`).join("")}</div>${weeks.map(week=>`<div class="cal-week">${week.map(({ds,outside})=>{const isToday=this._isToday(ds),d=new Date(ds+"T12:00:00"),evts=grouped[ds]||[],isWeekend=d.getDay()===0||d.getDay()===6;let cls="cal-day";if(isToday)cls+=" cal-today";if(outside)cls+=" cal-outside";if(isWeekend)cls+=" cal-weekend";if(ds<this._todayStr()&&!outside)cls+=" cal-past";return`<div class="${cls}" data-day-date="${ds}" style="cursor:pointer"><div class="cal-date">${d.getDate()}</div><div class="cal-events">${evts.filter(ev=>this._showFlagged||!this._isFlagged(ev)).map(ev=>{const isDrive=this._isDrive(ev.summary||"");const fl=this._isFlagged(ev);return`<div class="cal-event${isDrive?" cal-drive":""}" style="border-left:3px solid ${ev._color||"#888"}${fl?";opacity:0.4;text-decoration:line-through":""}"><span class="cal-event-time">${this._formatTimeShort(ev)}</span><span class="cal-event-text">${ev.summary||""}</span></div>`;}).join("")}</div></div>`;}).join("")}</div>`).join("")}</div>`;
  }

  // ====================== STYLES ======================

  _resolveTheme() {
    // Merge theme with defaults so every theme is fully populated. fontDisplay
    // falls back to font, eventTextStrong/Soft to text/muted.
    const raw = THEMES[this._theme] || THEMES.dark;
    const t = { ...THEME_DEFAULTS, ...raw };
    if (!t.fontDisplay) t.fontDisplay = t.font;
    if (!t.eventTextStrong) t.eventTextStrong = t.headerText || t.text;
    if (!t.eventTextSoft) t.eventTextSoft = t.muted;
    t._d = DENSITY[t.density] || DENSITY.regular;
    return t;
  }

  _getStyles() {
    const t = this._resolveTheme();
    const d = t._d;
    return `
      :host { display: block; font-family: ${t.font}; color: ${t.text};
        --card-bg: ${t.cardBg}; --today-bg: ${t.todayBg};
        --border: ${t.border}; --muted: ${t.muted}; --accent: ${t.accent};
        --font: ${t.font}; --font-display: ${t.fontDisplay};
        --radius: ${t.radius}; --radius-sm: ${t.radiusSm}; --radius-xs: ${t.radiusXs};
        --text-strong: ${t.eventTextStrong}; --text-soft: ${t.eventTextSoft};
        --header-text: ${t.headerText}; }
      .card { background: var(--card-bg); border-radius: var(--radius); overflow: hidden; position: relative; box-shadow: ${t.cardShadow}; }
      .card-locked { border-radius: var(--radius-sm); }
      /* Seam mode — when adjacent cards abut, flatten the touching corners
         and drop the shadow so the cards visually butt together. Pair with
         a horizontal-stack / vertical-stack to remove HA's grid gap. */
      .card.seam-left  { border-top-left-radius: 0;  border-bottom-left-radius: 0;  }
      .card.seam-right { border-top-right-radius: 0; border-bottom-right-radius: 0; }
      .card.seam-top   { border-top-left-radius: 0;  border-top-right-radius: 0;    }
      .card.seam-bottom{ border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
      .card.seam-left, .card.seam-right, .card.seam-top, .card.seam-bottom { box-shadow: none; }
      .header { display: flex; align-items: center; justify-content: space-between; padding: ${d.cardPad}; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: ${d.headerGap}; }
      .header .title { font-family: var(--font-display); font-size: ${t.titleSize}; font-weight: ${t.titleWeight}; letter-spacing: ${t.titleLetterSpacing}; text-transform: ${t.titleTransform}; color: var(--header-text); line-height: 1.1; }
      .header .meta { display: flex; gap: 16px; align-items: center; font-size: 14px; color: var(--muted); }
      .header .badge { background: #E0A020; color: #1e1e2e; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: var(--radius-sm); }
      .header .version { font-size: 11px; color: var(--muted); opacity: 0.5; }
      .view-toggle { display: flex; background: ${t.accentBg}; border: 1px solid var(--border); border-radius: ${t.radius === "0" ? "0" : "20px"}; padding: 3px; }
      .toggle-btn { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 8px 16px; border-radius: ${t.radius === "0" ? "0" : "16px"}; font-family: var(--font); font-size: 13px; font-weight: 600; transition: all 0.15s; }
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
      .floating-theme { position: absolute; top: 6px; right: 6px; z-index: 5; display: flex; gap: 4px; }
      .overview-top { display: grid; grid-template-columns: 3fr 2fr; gap: 0; border-bottom: 1px solid var(--border); min-height: ${d.overviewMin}; }
      .overview-col:first-child { border-right: 1px solid var(--border); border-left: 4px solid var(--accent); background: ${t.accentBg}; }
      .days { padding: 8px 0; }
      .day { padding: ${d.dayPad}; margin-bottom: ${d.daySpacing}; }
      .day-header { display: flex; align-items: center; gap: 10px; padding: ${d.dayHeaderPad}; font-family: var(--font-display); font-weight: ${t.dayHeaderWeight}; font-size: ${t.dayHeaderSize}; text-transform: ${t.dayHeaderTransform}; letter-spacing: ${t.dayHeaderLetterSpacing}; color: var(--muted); border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card-bg); z-index: 2; }
      .day.is-today .day-header { color: var(--header-text); font-size: ${t.todayHeaderSize}; }
      .day.is-tomorrow .day-header { color: var(--text-soft); font-size: calc(${t.dayHeaderSize} + 3px); }
      .day.is-today { background: var(--today-bg); border-radius: var(--radius-sm); padding-top: 8px; padding-bottom: 12px; margin-bottom: 8px; }
      .day-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
      .day.is-today .day-dot { background: var(--accent); width: 10px; height: 10px; }
      .day.is-tomorrow .day-dot { background: var(--accent); opacity: 0.6; }
      .event-count { font-size: 13px; color: var(--muted); font-weight: 400; text-transform: none; letter-spacing: 0; }
      .events { padding: 4px 0; }
      .event { display: grid; grid-template-columns: ${d.eventCols}; gap: ${d.eventGap}; padding: ${d.eventPadV} ${d.eventPadH}; border-bottom: 1px solid var(--border); align-items: start; cursor: pointer; border-radius: var(--radius-sm); }
      .event:hover { background: ${t.eventHover}; }
      .event:last-child { border-bottom: none; }
      .event-time { font-family: var(--font); font-size: ${t.eventTimeSize}; font-variant-numeric: tabular-nums; color: var(--muted); text-align: right; }
      .day.is-today .event-time { font-size: calc(${t.eventTimeSize} + 3px); color: var(--text-soft); }
      .event-body { min-width: 0; }
      .event-summary { font-family: var(--font); font-size: ${t.eventSummarySize}; font-weight: ${t.eventSummaryWeight}; color: var(--text-strong); display: flex; align-items: center; gap: 8px; line-height: 1.3; flex-wrap: wrap; }
      .day.is-today .event-summary { font-size: calc(${t.eventSummarySize} + 3px); color: var(--header-text); }
      .event-summary .person-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .event-location { font-size: 14px; color: var(--muted); margin-top: 2px; }
      .event.is-drive .event-summary { font-style: italic; color: var(--muted); font-weight: 400; }
      .event.is-drive .event-time { color: var(--muted); opacity: 0.6; }
      .flight-badge { display: inline-flex; align-items: center; gap: 4px; background: ${t.accentBg}; color: var(--accent); font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: var(--radius-sm); }
      .flag-tag { display: inline-flex; align-items: center; background: rgba(255,100,100,0.15); color: #FF6B6B; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-sm); text-decoration: none; }
      .no-events { padding: 8px 4px; font-size: 15px; color: var(--muted); opacity: 0.5; font-style: italic; }
      .weekend .day-header { color: var(--muted); opacity: 0.85; }
      .cal-grid { padding: ${d.calPad}; }
      .cal-header-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 4px; }
      .cal-header-cell { font-family: var(--font-display); text-align: center; font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: ${t.dayHeaderLetterSpacing === "0" ? "0.5px" : t.dayHeaderLetterSpacing}; padding: 4px 0; border-bottom: 1px solid var(--border); }
      .cal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 3px; align-items: stretch; }
      .cal-day { background: ${t.calDayBg}; border-radius: var(--radius-xs); padding: 4px; min-height: ${d.calMin}; overflow: hidden; }
      .cal-today { background: ${t.calTodayBg}; outline: 2px solid var(--accent); outline-offset: -2px; }
      .cal-outside { opacity: 0.25; }
      .cal-past { opacity: 0.35; }
      .cal-weekend { background: ${t.weekendBg}; }
      .cal-date { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--muted); margin-bottom: 3px; }
      .cal-today .cal-date { color: var(--accent); font-size: 15px; }
      .cal-events { display: flex; flex-direction: column; gap: 1px; }
      .cal-event { padding: 2px 4px; border-radius: var(--radius-xs); background: ${t.eventHover}; font-size: 11px; line-height: 1.25; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: flex; gap: 3px; align-items: baseline; }
      .cal-event-time { color: var(--muted); font-size: 10px; font-variant-numeric: tabular-nums; flex-shrink: 0; }
      .cal-event-text { overflow: hidden; text-overflow: ellipsis; color: var(--text-strong); font-size: 11px; }
      .cal-drive { opacity: 0.5; font-style: italic; }

      /* Modal */
      .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; }
      .modal { background: ${t.modalBg}; color: ${t.modalText}; border-radius: var(--radius); width: min(520px, 90vw); max-height: 85vh; overflow-y: auto; box-shadow: ${t.modalShadow}; font-family: var(--font); }
      .modal-header { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border); }
      .modal-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
      .modal-title { font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--text-strong); flex: 1; }
      .modal-close { background: transparent; border: none; color: var(--muted); font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); }
      .modal-close:hover { background: ${t.eventHover}; color: var(--text-strong); }
      .modal-body { padding: 16px 20px; }
      .modal-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 15px; line-height: 1.4; }
      .modal-row:last-child { border-bottom: none; }
      .modal-label { color: var(--muted); font-size: 13px; font-weight: 600; text-transform: uppercase; min-width: 60px; padding-top: 2px; }
      .modal-desc { font-size: 13px; color: var(--muted); line-height: 1.4; }

      /* Recheck */
      .recheck-btn { display: block; width: 100%; margin-top: 14px; padding: 12px; border: none; border-radius: var(--radius-sm); background: ${t.accentBg}; color: var(--accent); font-family: var(--font); font-size: 15px; font-weight: 600; cursor: pointer; }
      .recheck-btn:hover { filter: brightness(1.15); }
      .recheck-btn:disabled { opacity: 0.5; cursor: wait; }

      .origin-picker { margin-top: 14px; }
      .origin-label { font-size: 14px; font-weight: 600; color: var(--text-soft); margin-bottom: 8px; }
      .origin-buttons { display: flex; gap: 8px; margin-bottom: 6px; }
      .origin-btn { flex: 1; padding: 12px; border: 2px solid var(--border); border-radius: var(--radius-sm); background: transparent; font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer; color: var(--accent); }
      .origin-btn:hover { border-color: var(--accent); background: ${t.accentBg}; }
      .origin-btn:disabled { opacity: 0.5; cursor: wait; }
      .origin-hint { font-size: 11px; color: var(--muted); }

      .recheck-result { margin-top: 12px; padding: 14px; border-radius: var(--radius-sm); font-size: 14px; line-height: 1.5; }
      .recheck-result.ok { background: ${t.accentBg}; color: var(--accent); }
      .recheck-result.err { background: rgba(255,100,100,0.1); color: #FF6B6B; }
      .recheck-route { font-size: 13px; margin-bottom: 3px; color: var(--text-soft); }
      .recheck-label { color: var(--muted); font-weight: 600; font-size: 11px; text-transform: uppercase; margin-right: 4px; }
      .recheck-duration { margin-top: 8px; font-size: 18px; }
      .recheck-via { font-size: 12px; color: var(--muted); margin-top: 4px; }
      .traffic-ok { margin-top: 6px; font-size: 13px; color: var(--accent); }
      .traffic-warn { margin-top: 6px; font-size: 13px; color: #FF6B6B; background: rgba(255,100,100,0.1); padding: 8px; border-radius: var(--radius-sm); }
      .traffic-meta { font-size: 11px; opacity: 0.7; }

      .action-btn { display: block; width: 100%; margin-top: 10px; padding: 12px; border: none; border-radius: var(--radius-sm); font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer; }
      .action-btn:disabled { opacity: 0.5; cursor: wait; }
      .action-btn.action-update { background: #2E8B57; color: white; }
      .action-btn.action-update:hover { background: #1F6B41; }
      .action-btn.action-add-drive { background: ${t.accentBg}; color: var(--accent); }
      .action-btn.action-add-drive:hover { filter: brightness(1.15); }

      .action-result { margin-top: 10px; padding: 12px; border-radius: var(--radius-sm); font-size: 13px; line-height: 1.4; }
      .action-result.ok { background: rgba(46,139,87,0.15); color: var(--accent); }
      .action-result.err { background: rgba(255,100,100,0.1); color: #FF6B6B; }

      /* Per-theme escape hatch — appended last so it overrides any of the above. */
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
