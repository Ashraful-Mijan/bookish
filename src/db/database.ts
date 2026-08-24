import * as SQLite from 'expo-sqlite';
import type { Book, Bookmark, Collection } from './types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('boipoka.db');
  await migrate(db);
  return db;
}

async function migrate(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      coverPath TEXT,
      filePath TEXT NOT NULL,
      format TEXT NOT NULL,
      addedAt INTEGER NOT NULL,
      lastReadAt INTEGER,
      progress REAL NOT NULL DEFAULT 0,
      progressCfi TEXT,
      collectionId TEXT,
      bijoyConverted INTEGER NOT NULL DEFAULT 0,
      language TEXT
    );
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT,
      note TEXT,
      cfiText TEXT,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bookmarks_bookId ON bookmarks(bookId);
    CREATE INDEX IF NOT EXISTS idx_books_collection ON books(collectionId);
  `);
}

export type { Book, Bookmark, Collection };
