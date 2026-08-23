import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllBooks, getRecentBooks } from '../db/repository';
import { BookCard } from '../components/BookCard';
import { useImportBook } from '../utils/useImport';
import { AppColors } from '../theme';
import type { Book } from '../db/types';

export function LibraryScreen() {
  const navigation = useNavigation<any>();
  const importBook = useImportBook();
  const [books, setBooks] = useState<Book[]>([]);
  const [recent, setRecent] = useState<any>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setBooks(await getAllBooks());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
      getRecentBooks().then(setRecent);
    }, [reload]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Library</Text>
        <Pressable style={styles.importBtn} onPress={() => importBook()}>
          <Text style={styles.importTxt}>+ Import</Text>
        </Pressable>
      </View>

      {books.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTxt}>No books yet.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => importBook()}>
            <Text style={styles.emptyBtnTxt}>Import an EPUB or PDF</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <BookCard
              book={item}
              onPress={() => navigation.navigate('BookDetails', { bookId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: { fontSize: 28, fontWeight: '800', color: AppColors.text },
  importBtn: {
    backgroundColor: AppColors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  importTxt: { color: '#fff', fontWeight: '700' },
  row: { justifyContent: 'flex-start' },
  grid: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTxt: { fontSize: 16, color: AppColors.subtext, marginBottom: 16 },
  emptyBtn: {
    backgroundColor: AppColors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnTxt: { color: '#fff', fontWeight: '700' },
});
