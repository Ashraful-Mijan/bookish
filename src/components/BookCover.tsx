import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  coverPath: string | null;
  title: string;
  author?: string;
  width?: number;
  height?: number;
}

export function BookCover({ coverPath, title, author, width = 120, height = 180 }: Props) {
  const radius = 8;
  if (coverPath) {
    return (
      <Image
        source={{ uri: coverPath }}
        style={[styles.cover, { width, height, borderRadius: radius }]}
        resizeMode="cover"
      />
    );
  }
  // Placeholder with the book's first letter.
  const initial = title.trim().charAt(0) || '?';
  return (
    <View
      style={[
        styles.placeholder,
        { width, height, borderRadius: radius, backgroundColor: placeholderColor(title) },
      ]}>
      <Text style={styles.initial}>{initial}</Text>
      {author ? <Text style={styles.author} numberOfLines={2}>{author}</Text> : null}
    </View>
  );
}

function placeholderColor(title: string): string {
  const palette = ['#b4532a', '#3f6f5b', '#8a6d3b', '#5b4b8a', '#a14b56', '#2f6b8a'];
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

const styles = StyleSheet.create({
  cover: { backgroundColor: '#ddd' },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  initial: { color: '#fff', fontSize: 42, fontWeight: '700' },
  author: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
});
