import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookCover } from './BookCover';
import { AppColors } from '../theme';
import type { Book } from '../db/types';

export function BookCard({ book, onPress }: { book: Book; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <BookCover
        coverPath={book.coverPath}
        title={book.title}
        author={book.author}
        width={110}
        height={165}
      />
      <Text style={styles.title} numberOfLines={2}>
        {book.title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {book.author || 'Unknown'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 110, marginRight: 14, marginBottom: 16 },
  title: { marginTop: 6, fontSize: 13, fontWeight: '600', color: AppColors.text },
  author: { fontSize: 11, color: AppColors.subtext, marginTop: 2 },
});
