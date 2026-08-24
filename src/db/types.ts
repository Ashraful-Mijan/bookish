export type BookFormat = 'epub' | 'pdf';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverPath: string | null;
  filePath: string;
  format: BookFormat;
  addedAt: number;
  lastReadAt: number | null;
  progress: number; // 0..1
  progressCfi: string | null; // EPUB CFI or PDF page string
  collectionId: string | null;
  bijoyConverted: 0 | 1;
  language: string | null;
}

export type BookmarkType = 'bookmark' | 'highlight';

export interface Bookmark {
  id: string;
  bookId: string;
  location: string; // EPUB CFI or PDF page number (as string)
  type: BookmarkType;
  color: string | null;
  note: string | null;
  cfiText: string | null; // snippet of the marked text
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
}

export type ThemeName = 'light' | 'sepia' | 'dark';

export interface ReaderSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margin: number; // 0..2 (narrow..wide)
  theme: ThemeName;
  avroInput: 0 | 1;
}
