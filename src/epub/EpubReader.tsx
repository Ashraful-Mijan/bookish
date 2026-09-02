import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { MutableRefObject } from 'react';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import JSZip from 'jszip';
import { useSettings } from '../store/settingsStore';
import { defaultFontForKind, fontsByKind } from '../fonts/fonts';
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
  gotoHrefRef?: MutableRefObject<((href: string) => void) | null>;
  webViewRef?: MutableRefObject<WebView | null>;
}

const readerHtml = Asset.fromModule(require('../../assets/web/reader.html'));

function detectLanguage(book: Book): 'bengali' | 'english' {
  const lang = (book.language || '').toLowerCase();
  if (lang.startsWith('bn') || lang.startsWith('ben')) return 'bengali';
  return 'english';
}

function autoSelectFont(book: Book, settings: any): string {
  const lang = detectLanguage(book);
  const kind = lang;
  const list = fontsByKind(kind);
  const match = list.find((f) => f.family === settings.fontFamily);
  if (match) return settings.fontFamily;
  return defaultFontForKind(kind);
}

async function resolveOpfPath(zip: JSZip): Promise<string> {
  const container = zip.file('META-INF/container.xml');
  if (container) {
    const txt = await container.async('string');
    const m = txt.match(/full-path="([^"]+)"/i) || txt.match(/full-path='([^']+)'/i);
    if (m) return m[1];
  }
  const found = Object.keys(zip.files).find((n) => /\.opf$/i.test(n));
  return found || 'OEBPS/content.opf';
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(parseInt(d, 10)));
}

function resolveRelative(basePath: string, href: string): string {
  if (href.startsWith('/')) return href.slice(1);
  const parts = basePath.split('/');
  parts.pop();
  for (const seg of href.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function extractSpine(
  zip: JSZip,
  opfPath: string,
): Promise<Array<{ href: string; title?: string }>> {
  const opfFile = zip.file(opfPath);
  const opf = opfFile ? await opfFile.async('string') : '';
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';

  const manifest: Record<string, string> = {};
  const manifestRe = /<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = manifestRe.exec(opf)) !== null) {
    manifest[m[1]] = resolveRelative(base, m[2]);
  }

  const spine: Array<{ idref: string }> = [];
  const spineRe = /<itemref[^>]+idref="([^"]+)"[^>]*>/gi;
  while ((m = spineRe.exec(opf)) !== null) {
    spine.push({ idref: m[1] });
  }

  const titleRe = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i;
  const tm = opf.match(titleRe);
  const bookTitle = tm ? decodeHtmlEntities(tm[1].trim()) : '';

  const out: Array<{ href: string; title?: string }> = [];
  for (const item of spine) {
    const href = manifest[item.idref];
    if (href && zip.file(href)) {
      out.push({ href, title: bookTitle || undefined });
    }
  }
  if (out.length === 0) {
    const all = Object.keys(zip.files)
      .filter((n) => !zip.files[n].dir && /\.(x?html?|htm)$/i.test(n))
      .sort();
    for (const href of all) out.push({ href, title: bookTitle || undefined });
  }
  return out;
}

async function loadChapterText(zip: JSZip, href: string): Promise<string> {
  const f = zip.file(href);
  if (!f) return '';
  const buf = await f.async('uint8array');
  let text = new TextDecoder('utf-8').decode(buf);

  // Strip scripts/styles to avoid JS execution or CSS conflicts.
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');

  // If this is a full XHTML document, extract only the <body> contents
  // so innerHTML injection works correctly in the WebView.
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    text = bodyMatch[1].trim();
  }

  // Inline simple <img src="..."> references from the EPUB zip so images
  // render without a web server. Only inlines small images (<200KB).
  text = await inlineImages(zip, href, text);

  return text;
}

async function inlineImages(zip: JSZip, baseHref: string, text: string): Promise<string> {
  const imgRe = /<img([^>]*?)src=["']([^"']+)["']([^>]*)>/gi;
  const matches: Array<{ m: string; pre: string; src: string; post: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(text)) !== null) {
    matches.push({ m: m[0], pre: m[1], src: m[2], post: m[3] });
  }
  for (const item of matches) {
    const dataUrl = await inlineImg(zip, baseHref, item.src);
    text = text.replace(item.m, '<img' + item.pre + 'src="' + dataUrl + '"' + item.post + '>');
  }
  return text;
}

async function inlineImg(zip: JSZip, baseHref: string, src: string): Promise<string> {
  try {
    let imgPath = src.trim();
    if (!imgPath) return src;
    if (imgPath.startsWith('data:')) return imgPath;
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return src;
    // Resolve relative to chapter file.
    const base = baseHref.includes('/') ? baseHref.slice(0, baseHref.lastIndexOf('/') + 1) : '';
    let resolved = imgPath;
    if (imgPath.startsWith('/')) resolved = imgPath.slice(1);
    else {
      const parts = base.split('/');
      parts.pop();
      for (const seg of imgPath.split('/')) {
        if (!seg || seg === '.') continue;
        if (seg === '..') parts.pop();
        else parts.push(seg);
      }
      resolved = parts.join('/');
    }
    const imgFile = zip.file(resolved);
    if (!imgFile) return src;
    const bytes = await imgFile.async('uint8array');
    if (bytes.length > 200 * 1024) return src; // skip huge images
    const ext = resolved.split('.').pop()?.toLowerCase() || 'png';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'gif' ? 'image/gif'
      : ext === 'svg' ? 'image/svg+xml'
      : ext === 'webp' ? 'image/webp'
      : 'image/png';
    const u8 = new Uint8Array(bytes);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)) as unknown as number[]);
    }
    return 'data:' + mime + ';base64,' + btoa(binary);
  } catch (e) {
    return src;
  }
}

export const EpubReader = React.forwardRef(function EpubReader({
  book,
  startCfi,
  onProgress,
  onToc,
  onSelected,
  onReady,
  onError,
  gotoHrefRef,
  prevRef,
  nextRef,
}: Props, ref: React.Ref<{ injectInit: () => void }>) {
  useImperativeHandle(ref, () => ({ injectInit }));
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const didInit = useRef(false);
  const settings = useSettings();
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState<string | null>(null);
  const [chapters, setChapters] = useState<string[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await readerHtml.downloadAsync();
        const uri = (readerHtml as any).localUri || readerHtml.uri;
        const content = await FileSystem.readAsStringAsync(uri);
        if (mounted) setHtml(content);
      } catch (e) {
        onError?.('Failed to load reader HTML: ' + (e as Error).message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (gotoHrefRef) {
      gotoHrefRef.current = (href: string) => {
        const idx = chapters.findIndex((c) => c === href);
        if (idx >= 0) {
          setCurrentChapter(idx);
          webRef.current?.injectJavaScript(
            'window.__boipoka.gotoChapter(' + idx + ');',
          );
        }
      };
    }
    return () => {
      if (gotoHrefRef) gotoHrefRef.current = null;
    };
  }, [gotoHrefRef, chapters]);

  const injectInit = useCallback(async () => {
    if (didInit.current) return;
    try {
      const fileB64 = await FileSystem.readAsStringAsync(book.filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const zip = await JSZip.loadAsync(
        new Uint8Array(
          Array.from(atob(fileB64), (c) => c.charCodeAt(0)),
        ),
      );
      const opfPath = await resolveOpfPath(zip);
      const spine = await extractSpine(zip, opfPath);

      const chapterTexts: string[] = [];
      const toc: TocItem[] = [];
      for (let i = 0; i < spine.length; i++) {
        const text = await loadChapterText(zip, spine[i].href);
        const title =
          (spine[i].title || '').trim() ||
          stripTags(text).slice(0, 60) ||
          ('Chapter ' + (i + 1));
        chapterTexts.push(text);
        toc.push({ id: 'ch_' + i, label: title, href: spine[i].href });
      }

      didInit.current = true;
      setChapters(chapterTexts);
      onToc?.(toc);

      const lang = detectLanguage(book);
      const payload = {
        chapters: chapterTexts,
        hrefs: spine.map(function(x){ return x.href; }),
        start: 0,
        language: lang,
        settings: {
          fontFamily: autoSelectFont(book, settings),

          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize,
          lineHeight: settings.lineHeight,
          margin: settings.margin,
          theme: settings.theme,
        },
      };
      webRef.current?.injectJavaScript(
        'window.__boipoka.init(' + JSON.stringify(payload) + ');',
      );
    } catch (e) {
      onError?.((e as Error).message);
    }
  }, [book, settings, onError, onToc]);

  const pushSettings = useCallback(() => {
    if (!readyRef.current) return;
    webRef.current?.injectJavaScript(
      'window.__boipoka.applySettings(' +
        JSON.stringify({
          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize,
          lineHeight: settings.lineHeight,
          margin: settings.margin,
          theme: settings.theme,
        }) +
        ');',
    );
  }, [settings]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!readyRef.current) {
        onError?.('Reader did not respond within 10 seconds. Check network or try another book.');
      }
    }, 10000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [book.id, onError]);

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    let msg: any;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case 'ready':
        readyRef.current = true;
        setLoading(false);
        if (msg.chapter && msg.total) onProgress?.(String(msg.chapter - 1), msg.total);
        onReady?.();
        break;
      case 'webReady':
        injectInit();
        break;
      case 'debug':
        console.log('[ReaderWeb]', msg.message);
        break;
      case 'error':
        console.log('[ReaderWeb] ERROR:', msg.message);
        onError?.('Reader error: ' + msg.message);
        setLoading(false);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!loading && html) pushSettings();
  }, [loading, html, pushSettings]);

  if (!html) {
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
        key={book.id + (startCfi || '')}
        ref={webRef}
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        androidLayerType="hardware"
        onMessage={onMessage}
        onLoadStart={() => console.log('[ReaderWeb] load start')}
        onLoadEnd={() => {
          console.log('[ReaderWeb] load end');
          setTimeout(() => injectInit(), 1000);
          setTimeout(() => setLoading(false), 9000);
        }}
        onError={(e) => {
          console.log('[ReaderWeb] ERROR:', e.nativeEvent.description);
          onError?.(e.nativeEvent.description);
        }}
        style={styles.webview}
        backgroundColor="#ffffff"
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#b4532a" />
        </View>
      ) : null}
    </View>
  );
}); // end forwardRef

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
