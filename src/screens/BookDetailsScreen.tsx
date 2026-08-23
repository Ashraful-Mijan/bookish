import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import {
  deleteBook,
  getBook,
  getBookmarks,
  updateBookCollection,
} from '../db/repository';
import { BookCover } from '../components/BookCover';
import { AppColors } from '../theme';
import type { Book, Bookmark, Collection } from '../db/types';

export function BookDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const bookId = (route.params as { bookId: string }).bookId;
  const [book, setBook] = useState<Book | null>(null);
  const [marks, setMarks] = useState<Bookmark[]>([]);

  const reload = useCallback(async () => {
    const b = await getBook(bookId);
    setBook(b);
    if (b) setMarks(await getBookmarks(b.id));
  }, [bookId]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onDelete = () => {
    if (!book) return;
    Alert.alert('Delete book', `Remove "${book.title}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBook(book.id);
          if (book.coverPath) FileSystem.deleteAsync(book.coverPath, { idempotent: true });
          if (book.filePath) FileSystem.deleteAsync(book.filePath, { idempotent: true });
          navigation.goBack();
        },
      },
    ]);
  };

  if (!book) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <BookCover
          coverPath={book.coverPath}
          title={book.title}
          author={book.author}
          width={150}
          height={225}
        />
        <View style={styles.meta}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author || 'Unknown'}</Text>
          <Text style={styles.format}>{book.format.toUpperCase()}</Text>
          {book.bijoyConverted ? (
            <Text style={styles.badge}>Bijoy → Unicode converted</Text>
          ) : null}
        </View>
      </View>

      <Pressable
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('Reader', { bookId: book.id })}>
        <Text style={styles.primaryTxt}>
          {book.progress > 0 ? 'Continue' : 'Start Reading'}
        </Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bookmarks & Notes ({marks.length})</Text>
        {marks.length === 0 ? (
          <Text style={styles.muted}>No bookmarks yet.</Text>
        ) : (
          marks.map((m) => (
            <View key={m.id} style={styles.markItem}>
              <Text style={styles.markText} numberOfLines={2}>
                {m.cfiText || (m.type === 'bookmark' ? 'Bookmark' : 'Highlight')}
              </Text>
              {m.note ? <Text style={styles.markNote} numberOfLines={2}>{m.note}</Text> : null}
            </View>
          ))
        )}
      </View>

      <Pressable style={styles.dangerBtn} onPress={onDelete}>
        <Text style={styles.dangerTxt}>Delete Book</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.bg },
  content: { padding: 20 },
  top: { flexDirection: 'row' },
  meta: { flex: 1, marginLeft: 18, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: AppColors.text },
  author: { fontSize: 16, color: AppColors.subtext, marginTop: 4 },
  format: { fontSize: 12, color: AppColors.subtext, marginTop: 6 },
  badge: { marginTop: 10, fontSize: 12, color: AppColors.accent, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text, marginBottom: 8 },
  muted: { color: AppColors.subtext },
  markItem: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  markText: { fontSize: 14, color: AppColors.text },
  markNote: { fontSize: 13, color: AppColors.subtext, marginTop: 4 },
  dangerBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#d9534f',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerTxt: { color: '#d9534f', fontWeight: '700' },
});
