/* ---------------------------------------------------------------
   Clock typefaces.

   Nothing is bundled — every preset is a stack of families that ship
   with Windows/macOS, so the clock looks right offline and the app
   stays small. "Fliqlo Classic" is the Helvetica Neue / Arial Bold
   pairing the original screensaver uses.
   --------------------------------------------------------------- */

export const CLOCK_FONTS = [
  {
    id: 'fliqlo',
    label: 'Fliqlo Classic',
    note: 'Helvetica Neue · Arial',
    stack: '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif',
    weight: 700,
  },
  {
    id: 'sf',
    label: 'Apple SF Pro',
    note: 'SF Pro Display · Segoe UI',
    stack: '"SF Pro Display", "SF Pro Text", -apple-system, "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
    weight: 600,
  },
  {
    id: 'rounded',
    label: 'Rounded',
    note: 'SF Pro Rounded · Nunito',
    stack: '"SF Pro Rounded", "Segoe UI Variable Display", Nunito, "Varela Round", "Trebuchet MS", system-ui, sans-serif',
    weight: 600,
  },
  {
    id: 'condensed',
    label: 'Condensed',
    note: 'Arial Narrow · Bahnschrift',
    stack: 'Bahnschrift, "Archivo Narrow", "Roboto Condensed", "Arial Narrow", "Helvetica Neue", sans-serif',
    weight: 700,
  },
  {
    id: 'mono',
    label: 'Monospace',
    note: 'Cascadia · SF Mono',
    stack: '"Cascadia Mono", "JetBrains Mono", "SF Mono", Menlo, Consolas, ui-monospace, monospace',
    weight: 500,
  },
  {
    id: 'serif',
    label: 'Serif',
    note: 'New York · Georgia',
    stack: '"New York", Georgia, "Times New Roman", "Nimbus Roman", serif',
    weight: 600,
  },
  {
    id: 'display',
    label: 'Display',
    note: 'Impact · Haettenschweiler',
    stack: '"Haettenschweiler", "Franklin Gothic Heavy", Impact, "Arial Black", sans-serif',
    weight: 400,
  },
  {
    id: 'custom',
    label: 'Custom…',
    note: 'Any font installed on this machine',
    stack: '',
    weight: 600,
  },
];

export const WEIGHTS = [
  [0, 'Auto'], [200, 'Thin'], [300, 'Light'], [400, 'Regular'],
  [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Heavy'],
];

export const getFont = (id) => CLOCK_FONTS.find((f) => f.id === id) || CLOCK_FONTS[0];

/** Resolves the settings into a CSS font-family value. */
export function fontStack(settings) {
  const font = getFont(settings.clockFont);
  if (font.id !== 'custom') return font.stack;
  const custom = (settings.clockFontCustom || '').trim();
  return custom
    ? `"${custom.replace(/"/g, '')}", ${CLOCK_FONTS[0].stack}`
    : CLOCK_FONTS[0].stack;
}
