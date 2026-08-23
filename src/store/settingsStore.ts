import { create } from 'zustand';
import { DEFAULT_SETTINGS, getSetting, setSetting } from '../db/repository';
import type { ReaderSettings } from '../db/types';

interface SettingsState extends ReaderSettings {
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<ReaderSettings>) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const stored = await getSetting<ReaderSettings>('readerSettings');
    if (stored) {
      set({ ...stored, loaded: true });
    } else {
      set({ loaded: true });
    }
  },
  update: async (patch) => {
    set(patch);
    const cur = get();
    const toSave: ReaderSettings = {
      fontFamily: cur.fontFamily,
      fontSize: cur.fontSize,
      lineHeight: cur.lineHeight,
      margin: cur.margin,
      theme: cur.theme,
      avroInput: cur.avroInput,
    };
    await setSetting('readerSettings', toSave);
  },
}));
