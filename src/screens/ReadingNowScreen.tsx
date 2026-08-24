import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllBooks, getRecentBooks } from '../db/repository';
import { BookCover } from '../components/BookCover';
import { useImportBook } from '../utils/useImport';
import { AppColors } from '../theme';
import type { Book } from '../db/types';

export function ReadingNowScreen() {
  const navigation = useNavigation<any>();
  const importBook = useImportBook();
  const [recent, setRecent] = useState<Book[]>([]);
  const [all, setAll] = useState<Book[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecentBooks(10).then(setRecent);
      getAllBooks().then(setAll);
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Reading Now</Text>

      {recent.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTxt}>Pick up where you left off.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => importBook()}>
            <Text style={styles.emptyBtnTxt}>Import a book</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={recent}
          horizontal
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.carousel}
          renderItem={({ item }) => (
            <Pressable
              style={styles.continueItem}
              onPress={() => navigation.navigate('Reader', { bookId: item.id })}>
              <BookCover
                coverPath={item.coverPath}
                title={item.title}
                author={item.author}
                width={130}
                height={195}
              />
              <Text style={styles.continueTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${Math.round(item.progress * 100)}%` }]}
                />
              </View>
            </Pressable>
          )}
        />
      )}

      <Text style={styles.section}>Your Library</Text>
      <FlatList
        data={all.slice(0, 12)}
        keyExtractor={(b) => b.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <Pressable
            style={styles.libItem}
            onPress={() => navigation.navigate('BookDetails', { bookId: item.id })}>
            <BookCover
              coverPath={item.coverPath}
              title={item.title}
              author={item.author}
              width={100}
              height={150}
            />
            <Text style={styles.libTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.bg },
  heading: { fontSize: 30, fontWeight: '800', color: AppColors.text, padding: 16 },
  empty: { padding: 32, alignItems: 'center' },
  emptyTxt: { color: AppColors.subtext, marginBottom: 14 },
  emptyBtn: { backgroundColor: AppColors.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  emptyBtnTxt: { color: '#fff', fontWeight: '700' },
  carousel: { paddingHorizontal: 16 },
  continueItem: { width: 130, marginRight: 16 },
  continueTitle: { marginTop: 6, fontSize: 13, fontWeight: '600', color: AppColors.text },
  progressTrack: { height: 4, backgroundColor: AppColors.separator, borderRadius: 2, marginTop: 6 },
  progressFill: { height: 4, backgroundColor: AppColors.accent, borderRadius: 2 },
  section: { fontSize: 20, fontWeight: '700', color: AppColors.text, margin: 16 },
  row: { justifyContent: 'flex-start' },
  grid: { paddingHorizontal: 16, paddingBottom: 24 },
  libItem: { width: 100, marginRight: 14, marginBottom: 16 },
  libTitle: { marginTop: 6, fontSize: 12, color: AppColors.text, fontWeight: '600' },
});
