// Categorical palette validated (CVD + contrast) against this app's dark
// surface (#111a2e) via the dataviz skill's validate_palette.js script.
export const CHART_COLORS = {
  blue: "#3987e5",
  orange: "#d95926",
  aqua: "#199e70",
  yellow: "#c98500",
  magenta: "#d55181",
  green: "#008300",
  violet: "#9085e9",
  red: "#e66767",
} as const;

export const CATEGORICAL_ORDER = [
  CHART_COLORS.blue,
  CHART_COLORS.orange,
  CHART_COLORS.aqua,
  CHART_COLORS.yellow,
  CHART_COLORS.magenta,
  CHART_COLORS.green,
  CHART_COLORS.violet,
  CHART_COLORS.red,
];

export const CHART_GRID = "#223154"; // matches --color-border
export const CHART_AXIS = "#5c6789"; // matches --color-text-faint
export const CHART_TOOLTIP_BG = "#16213b"; // matches --color-surface-alt
