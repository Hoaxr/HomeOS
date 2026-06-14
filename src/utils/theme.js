export const THEME_SECONDARIES = {
  '#6366f1': '#a855f7', // Indigo -> Purple
  '#10b981': '#06b6d4', // Emerald -> Cyan
  '#f59e0b': '#f97316', // Amber -> Orange
  '#f43f5e': '#d946ef', // Rose -> Fuchsia
  '#0ea5e9': '#6366f1', // Sky -> Indigo
  '#8b5cf6': '#ec4899', // Violet -> Pink
};

export const resolveSecondary = (color) => THEME_SECONDARIES[color] ?? '#a855f7';
