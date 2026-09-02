export interface ReaderFont {
  id: string;
  label: string;
  family: string;
  googleFont?: string;
  kind: 'bengali' | 'english' | 'both';
}

export const READER_FONTS: ReaderFont[] = [
  { id: 'noto-bengali', label: 'Noto Sans Bengali', family: 'Noto Sans Bengali', googleFont: 'Noto+Sans+Bengali', kind: 'bengali' },
  { id: 'hind', label: 'Hind Siliguri', family: 'Hind Siliguri', googleFont: 'Hind+Siliguri', kind: 'bengali' },
  { id: 'tiro', label: 'Tiro Bangla', family: 'Tiro Bangla', googleFont: 'Tiro+Bangla', kind: 'bengali' },
  { id: 'mukta', label: 'Mukta', family: 'Mukta', googleFont: 'Mukta', kind: 'bengali' },
  { id: 'galada', label: 'Galada', family: 'Galada', googleFont: 'Galada', kind: 'bengali' },
  { id: 'solaiman', label: 'SolaimanLipi', family: 'SolaimanLipi', kind: 'bengali' },
  { id: 'kalpurush', label: 'Kalpurush', family: 'Kalpurush', kind: 'bengali' },

  { id: 'noto-sans', label: 'Noto Sans', family: 'Noto Sans', googleFont: 'Noto+Sans', kind: 'english' },
  { id: 'merriweather', label: 'Merriweather', family: 'Merriweather', googleFont: 'Merriweather', kind: 'english' },
  { id: 'inter', label: 'Inter', family: 'Inter', googleFont: 'Inter', kind: 'english' },
  { id: 'literata', label: 'Literata', family: 'Literata', googleFont: 'Literata', kind: 'english' },
  { id: 'lora', label: 'Lora', family: 'Lora', googleFont: 'Lora', kind: 'english' },
  { id: 'roboto', label: 'Roboto', family: 'Roboto', googleFont: 'Roboto', kind: 'english' },

  { id: 'noto-serif', label: 'Noto Serif', family: 'Noto Serif', googleFont: 'Noto+Serif', kind: 'both' },
];

export function fontByFamily(family: string): ReaderFont | null {
  return READER_FONTS.find((f) => f.family === family) ?? null;
}

export function fontsByKind(kind: ReaderFont['kind']): ReaderFont[] {
  return READER_FONTS.filter((f) => f.kind === kind || f.kind === 'both');
}

export function defaultFontForKind(kind: ReaderFont['kind']): string {
  const list = fontsByKind(kind);
  return list[0]?.family ?? READER_FONTS[0].family;
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

export function marginPx(level: number): number {
  return [12, 44, 76][Math.max(0, Math.min(2, level))];
}
