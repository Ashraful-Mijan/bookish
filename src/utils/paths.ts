import * as FileSystem from 'expo-file-system';

export const BOOKS_DIR = `${FileSystem.documentDirectory}books`;
export const COVERS_DIR = `${FileSystem.documentDirectory}covers`;

export async function ensureDirs(): Promise<void> {
  await FileSystem.makeDirectoryAsync(BOOKS_DIR, { intermediates: true });
  await FileSystem.makeDirectoryAsync(COVERS_DIR, { intermediates: true });
}

export function bookFilePath(id: string, format: string): string {
  return `${BOOKS_DIR}/${id}.${format}`;
}

export function coverFilePath(id: string): string {
  return `${COVERS_DIR}/${id}.jpg`;
}
