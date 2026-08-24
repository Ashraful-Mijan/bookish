export interface BengaliFont {
  id: string;
  label: string;
  family: string;
  /** Google Fonts family query, if the font is available on Google Fonts. */
  googleFont?: string;
}

/**
 * Reader font choices. The first entries are Unicode Bengali fonts served by
 * Google Fonts (loaded in the reader WebView) so the app works out of the
 * box. `SolaimanLipi` / `Kalpurush` are the classic Bengali Unicode fonts and
 * require dropping the .ttf files into `assets/fonts/` (see README) for
 * offline use; otherwise they fall back to Noto Sans Bengali.
 */
export const BENGALI_FONTS: BengaliFont[] = [
  { id: 'noto', label: 'Noto Sans Bengali', family: 'Noto Sans Bengali', googleFont: 'Noto+Sans+Bengali' },
  { id: 'hind', label: 'Hind Siliguri', family: 'Hind Siliguri', googleFont: 'Hind+Siliguri' },
  { id: 'tiro', label: 'Tiro Bangla', family: 'Tiro Bangla', googleFont: 'Tiro+Bangla' },
  { id: 'mukta', label: 'Mukta', family: 'Mukta', googleFont: 'Mukta' },
  { id: 'galada', label: 'Galada', family: 'Galada', googleFont: 'Galada' },
  { id: 'solaiman', label: 'SolaimanLipi', family: 'SolaimanLipi' },
  { id: 'kalpurush', label: 'Kalpurush', family: 'Kalpurush' },
];

export function fontByFamily(family: string): BengaliFont | null {
  return BENGALI_FONTS.find((f) => f.family === family) ?? null;
}

export interface ReaderTheme {
  id: 'light' | 'sepia' | 'dark';
  label: string;
  bg: string;
  fg: string;
}

export const READER_THEMES: ReaderTheme[] = [
  { id: 'light', label: 'Light', bg: '#ffffff', fg: '#1c1c1e' },
  { id: 'sepia', label: 'Sepia', bg: '#f7ecd9', fg: '#5b4636' },
  { id: 'dark', label: 'Dark', bg: '#1c1c1e', fg: '#d8d8d8' },
];

/** Margin level (0..2) -> horizontal padding in px. */
export function marginPx(level: number): number {
  return [12, 44, 76][Math.max(0, Math.min(2, level))];
}
