import React from 'react';
import { StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';
import type { Book } from '../db/types';

interface Props {
  book: Book;
  startPage?: number;
  onProgress?: (page: number, total: number) => void;
  onError?: (message: string) => void;
}

export function PdfReader({ book, startPage = 1, onProgress, onError }: Props) {
  return (
    <View style={styles.container}>
      <Pdf
        source={{ uri: book.filePath, cache: true }}
        page={startPage}
        onPageChanged={(page, total) => onProgress?.(page, total)}
        onLoadComplete={(total) => onProgress?.(startPage, total)}
        onError={(err) => onError?.(String(err))}
        style={styles.pdf}
        enablePaging={false}
        fitPolicy={0}
        trustAllCerts={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#525252' },
  pdf: { flex: 1, width: '100%' },
});
