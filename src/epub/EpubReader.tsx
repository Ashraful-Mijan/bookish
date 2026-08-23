import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { MutableRefObject } from 'react';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { useSettings } from '../store/settingsStore';
import type { Book } from '../db/types';

export interface TocItem {
  id: string;
  label: string;
  href: string;
  subitems?: TocItem[];
}

interface Props {
  book: Book;
  startCfi?: string | null;
  onProgress?: (cfi: string, percent: number) => void;
  onToc?: (items: TocItem[]) => void;
  onSelected?: (cfi: string, text: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  /** Receives a function that navigates the rendition to a TOC href. */
  gotoHrefRef?: MutableRefObject<((href: string) => void) | null>;
}

const readerHtml = Asset.fromModule(require('../../assets/web/reader.html'));

export function EpubReader({
  book,
  startCfi,
  onProgress,
  onToc,
  onSelected,
  onReady,
  onError,
  gotoHrefRef,
}: Props) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const settings = useSettings();
  const [loading, setLoading] = useState(true);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    readerHtml.downloadAsync().then(() => {
      if (mounted) setHtmlUri(readerHtml.uri);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (gotoHrefRef) {
      gotoHrefRef.current = (href: string) =>
        webRef.current?.postMessage(JSON.stringify({ type: 'goto', href }));
    }
    return () => {
      if (gotoHrefRef) gotoHrefRef.current = null;
    };
  }, [gotoHrefRef]);

  const pushSettings = useCallback(() => {
    if (!readyRef.current) return;
    webRef.current?.postMessage(
      JSON.stringify({
        type: 'settings',
        settings: {
          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize,
          lineHeight: settings.lineHeight,
          margin: settings.margin,
          theme: settings.theme,
        },
      }),
    );
  }, [settings]);

  const sendInit = useCallback(async () => {
    try {
      const base64 = await FileSystem.readAsStringAsync(book.filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      readyRef.current = true;
      webRef.current?.postMessage(
        JSON.stringify({
          type: 'init',
          base64,
          cfi: startCfi,
          settings: {
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize,
            lineHeight: settings.lineHeight,
            margin: settings.margin,
            theme: settings.theme,
          },
        }),
      );
      setLoading(false);
    } catch (e) {
      onError?.((e as Error).message);
    }
  }, [book, startCfi, settings, onError]);

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    let msg: any;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case 'boot':
        sendInit();
        break;
      case 'progress':
        onProgress?.(msg.cfi, msg.percent ?? 0);
        break;
      case 'toc':
        onToc?.(msg.items ?? []);
        break;
      case 'selected':
        onSelected?.(msg.cfi, msg.text ?? '');
        break;
      case 'ready':
        onReady?.();
        break;
      case 'error':
        onError?.(msg.message);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!loading && htmlUri) pushSettings();
  }, [loading, htmlUri, pushSettings]);

  if (!htmlUri) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#b4532a" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ uri: htmlUri }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        onMessage={onMessage}
        onError={(e) => onError?.(e.nativeEvent.description)}
        style={styles.webview}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#b4532a" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
