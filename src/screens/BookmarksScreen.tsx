import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  deleteBookmark,
  getAllBooks,
  getBookmarks,
} from '../db/repository';
import { AppColors } from '../theme';
import type { Bookmark } from '../db/types';

interface Row {
  bm: Bookmark;
  bookTitle: string;
}

export function BookmarksScreen() {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<Row[]>([]);

  const reload = useCallback(async () => {
    const books = await getAllBooks();
    const list: Row[] = [];
    for (const b of books) {
      const marks = await getBookmarks(b.id);
      for (const m of marks) list.push({ bm: m, bookTitle: b.title });
    }
    setRows(list);
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const remove = async (id: string) => {
    await deleteBookmark(id);
    reload();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Bookmarks & Notes</Text>
      {rows.length === 0 ? (
        <Text style={styles.muted}>No bookmarks yet.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.bm.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Pressable
                style={styles.itemMain}
                onPress={() =>
                  navigation.navigate('Reader', {
                    bookId: item.bm.bookId,
                    cfi: item.bm.location,
                  })
                }>
                <Text style={styles.bookTitle}>{item.bookTitle}</Text>
                <Text style={styles.snippet} numberOfLines={2}>
                  {item.bm.cfiText || (item.bm.type === 'highlight' ? 'Highlight' : 'Bookmark')}
                </Text>
                {item.bm.note ? (
                  <Text style={styles.note} numberOfLines={2}>
                    {item.bm.note}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable style={styles.del} onPress={() => remove(item.bm.id)}>
                <Text style={styles.delTxt}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.bg },
  heading: { fontSize: 28, fontWeight: '800', color: AppColors.text, padding: 16 },
  muted: { color: AppColors.subtext, paddingHorizontal: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  item: {
    flexDirection: 'row',
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  itemMain: { flex: 1, padding: 14 },
  bookTitle: { fontSize: 13, fontWeight: '700', color: AppColors.accent },
  snippet: { fontSize: 14, color: AppColors.text, marginTop: 4 },
  note: { fontSize: 13, color: AppColors.subtext, marginTop: 4, fontStyle: 'italic' },
  del: { paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#fbeaea' },
  delTxt: { color: '#d9534f', fontWeight: '600' },
});
