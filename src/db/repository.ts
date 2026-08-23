import { getDb } from './database';
import type { Book, Bookmark, Collection, ReaderSettings } from './types';

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontFamily: 'Noto Sans Bengali',
  fontSize: 18,
  lineHeight: 1.6,
  margin: 1,
  theme: 'light',
  avroInput: 0,
};

export async function insertBook(book: Book): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO books
      (id, title, author, coverPath, filePath, format, addedAt, lastReadAt, progress, progressCfi, collectionId, bijoyConverted, language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.id,
      book.title,
      book.author,
      book.coverPath,
      book.filePath,
      book.format,
      book.addedAt,
      book.lastReadAt,
      book.progress,
      book.progressCfi,
      book.collectionId,
      book.bijoyConverted,
      book.language,
    ],
  );
}

export async function getBook(id: string): Promise<Book | null> {
  const db = await getDb();
  return (await db.getFirstAsync<Book>('SELECT * FROM books WHERE id = ?', [id])) ?? null;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDb();
  return db.getAllAsync<Book>('SELECT * FROM books ORDER BY addedAt DESC');
}

export async function getRecentBooks(limit = 10): Promise<Book[]> {
  const db = await getDb();
  return db.getAllAsync<Book>(
    'SELECT * FROM books WHERE progress > 0 ORDER BY lastReadAt DESC LIMIT ?',
    [limit],
  );
}

export async function updateBookProgress(
  id: string,
  progress: number,
  cfi: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE books SET progress = ?, progressCfi = ?, lastReadAt = ? WHERE id = ?',
    [progress, cfi, Date.now(), id],
  );
}

export async function touchBook(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE books SET lastReadAt = ? WHERE id = ?', [Date.now(), id]);
}

export async function updateBookCollection(
  id: string,
  collectionId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE books SET collectionId = ? WHERE id = ?', [collectionId, id]);
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
  await db.runAsync('DELETE FROM bookmarks WHERE bookId = ?', [id]);
}

export async function insertBookmark(bm: Bookmark): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO bookmarks
      (id, bookId, location, type, color, note, cfiText, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [bm.id, bm.bookId, bm.location, bm.type, bm.color, bm.note, bm.cfiText, bm.createdAt],
  );
}

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
  const db = await getDb();
  return db.getAllAsync<Bookmark>(
    'SELECT * FROM bookmarks WHERE bookId = ? ORDER BY createdAt ASC',
    [bookId],
  );
}

export async function updateBookmarkNote(id: string, note: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE bookmarks SET note = ? WHERE id = ?', [note, id]);
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bookmarks WHERE id = ?', [id]);
}

export async function getCollections(): Promise<Collection[]> {
  const db = await getDb();
  return db.getAllAsync<Collection>('SELECT * FROM collections ORDER BY name ASC');
}

export async function createCollection(name: string): Promise<Collection> {
  const db = await getDb();
  const id = `col_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  await db.runAsync('INSERT OR REPLACE INTO collections (id, name) VALUES (?, ?)', [id, name]);
  return { id, name };
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE books SET collectionId = NULL WHERE collectionId = ?', [id]);
  await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
}

export async function getSetting<T = string>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as unknown as T;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, JSON.stringify(value)],
  );
}
