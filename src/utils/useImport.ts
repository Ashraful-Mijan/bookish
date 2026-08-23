import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { importBook } from '../importer/importBook';
import type { Book } from '../db/types';

/** Picks a book from the device and opens the reader on success. */
export function useImportBook() {
  const navigation = useNavigation<any>();
  return useCallback(
    async (options?: { forceBijoy?: boolean }) => {
      const book: Book | null = await importBook(options);
      if (book) navigation.navigate('Reader', { bookId: book.id });
      return book;
    },
    [navigation],
  );
}
