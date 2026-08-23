import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAllBooks } from '../db/repository';
import { AvroInput } from '../components/AvroInput';
import { BookCard } from '../components/BookCard';
import { AppColors } from '../theme';
import type { Book } from '../db/types';

export function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);

  // Load once; filter in-memory as the user types.
  React.useEffect(() => {
    getAllBooks().then(setBooks);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q),
    );
  }, [query, books]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Search</Text>
      </View>
      <View style={styles.searchBox}>
        <AvroInput
          style={styles.searchInput}
          placeholder="Search by title or author (Avro typing on)"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {query && results.length === 0 ? (
        <Text style={styles.muted}>No matches.</Text>
      ) : null}
      <FlatList
        data={results}
        keyExtractor={(b) => b.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            onPress={() => navigation.navigate('BookDetails', { bookId: item.id })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.bg },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 28, fontWeight: '800', color: AppColors.text },
  searchBox: {
    marginHorizontal: 16,
    backgroundColor: AppColors.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  searchInput: { fontSize: 16, color: AppColors.text, paddingVertical: 8 },
  muted: { color: AppColors.subtext, paddingHorizontal: 16 },
  row: { justifyContent: 'flex-start' },
  grid: { paddingHorizontal: 16, paddingBottom: 24 },
});
