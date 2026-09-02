import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { EpubReader, TocItem } from '../epub/EpubReader';
import { PdfReader } from '../pdf/PdfReader';
import { useSettings } from '../store/settingsStore';
import { BENGALI_FONTS, READER_THEMES, marginPx } from '../fonts/fonts';
import {
  getBook,
  updateBookProgress,
  insertBookmark,
  getBookmarks,
  deleteBookmark,
  updateBookmarkNote,
} from '../db/repository';
import { uid } from '../utils/id';
import { AvroInput } from '../components/AvroInput';
import { AppColors } from '../theme';
import type { Book, Bookmark } from '../db/types';

export function ReaderScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as { bookId: string; cfi?: string };
  const bookId = params.bookId;
  const startCfiOverride = params.cfi;

  const [book, setBook] = useState<Book | null>(null);
  const [percent, setPercent] = useState(0);
  const [currentCfi, setCurrentCfi] = useState<string | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [chapterCount, setChapterCount] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [pending, setPending] = useState<{ cfi: string; text: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const settings = useSettings();
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gotoRef = useRef<((href: string) => void) | null>(null);
  const prevRef = useRef<(() => void) | null>(null);
  const nextRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    (async () => {
      const b = await getBook(bookId);
      setBook(b);
      if (b) {
        setPercent(b.progress);
        setCurrentCfi(b.progressCfi);
        setBookmarks(await getBookmarks(b.id));
      }
    })();
  }, [bookId]);

  const saveProgress = useCallback(
    (chapterIndex: number, totalChapters: number) => {
      const pct = totalChapters > 0 ? chapterIndex / totalChapters : 0;
      setPercent(pct);
      setCurrentChapter(chapterIndex);
      const cfi = String(chapterIndex);
      if (progressTimer.current) clearTimeout(progressTimer.current);
      progressTimer.current = setTimeout(() => {
        updateBookProgress(book.id, pct, cfi);
      }, 700);
    },
    [book],
  );

  const [readerError, setReaderError] = useState<string | null>(null);
  const onError = useCallback((message: string) => {
    console.warn('[Reader]', message);
    setReaderError(message);
  }, []);

  const addBookmark = useCallback(
    async (type: 'bookmark' | 'highlight') => {
      if (!book) return;
      const cfi = pending?.cfi ?? currentCfi ?? '';
      if (!cfi) return;
      const bm: Bookmark = {
        id: uid('bm_'),
        bookId: book.id,
        location: cfi,
        type,
        color: type === 'highlight' ? '#ffe08a' : null,
        note: noteDraft || null,
        cfiText: pending?.text || null,
        createdAt: Date.now(),
      };
      await insertBookmark(bm);
      setBookmarks(await getBookmarks(book.id));
      setPending(null);
      setNoteDraft('');
    },
    [book, pending, currentCfi, noteDraft],
  );

  const removeBookmark = useCallback(
    async (id: string) => {
      if (!book) return;
      await deleteBookmark(id);
      setBookmarks(await getBookmarks(book.id));
    },
    [book],
  );

  if (!book) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AppColors.accent} />
      </View>
    );
  }

  const isPdf = book.format === 'pdf';
  const effectiveCfi = startCfiOverride ?? currentCfi;
  const startPage = effectiveCfi ? parseInt(effectiveCfi, 10) || 1 : 1;

  return (
    <View style={styles.flex}>
      <StatusBar hidden />
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.iconTxt}>‹</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {book.title}
          </Text>
        </View>
        <Text style={styles.pct}>{chapterCount > 0 ? (currentChapter + 1) + '/' + chapterCount : Math.round(percent * 100) + '%'}</Text>
        <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('BookDetails', { bookId: book.id })}>
          <Text style={styles.iconTxt}>i</Text>
        </Pressable>
      </View>

      {/* Reader */}
      <View style={styles.readerArea}>
        {isPdf ? (
          <PdfReader
            book={book}
            startPage={startPage}
            onProgress={(page, total) =>
              saveProgress(String(page), total ? page / total : 0)
            }
            onError={onError}
          />
        ) : (
          <EpubReader
            book={book}
            startCfi={effectiveCfi}
            onProgress={(ch, total) => saveProgress(parseInt(ch, 10) || 0, total || 1)}
            onToc={(items) => { setToc(items); if (items.length) setChapterCount(items.length); }}
            onSelected={(cfi, text) => setPending({ cfi, text })}
            onError={onError}
            gotoHrefRef={gotoRef}
            prevRef={prevRef}
            nextRef={nextRef}
          />
        )}
      </View>

      {readerError ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Could not open book</Text>
          <Text style={styles.errorMsg} numberOfLines={8}>{readerError}</Text>
          <Pressable style={styles.closeBtn} onPress={() => setReaderError(null)}>
            <Text style={styles.closeBtnTxt}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Bottom toolbar */}
      <View style={styles.bottomBar}>
        {!isPdf ? (
          <Pressable
            style={styles.toolBtn}
            onPress={() => {
              prevRef.current?.();
            }}>
            <Text style={styles.toolTxt}>‹ Prev</Text>
          </Pressable>
        ) : (
          <View style={styles.toolBtn} />
        )}
        {!isPdf ? (
          <Pressable style={styles.toolBtn} onPress={() => setShowToc(true)}>
            <Text style={styles.toolTxt}>Contents</Text>
          </Pressable>
        ) : (
          <View style={styles.toolBtn} />
        )}
        {!isPdf ? (
          <Pressable
            style={styles.toolBtn}
            onPress={() => {
              nextRef.current?.();
            }}>
            <Text style={styles.toolTxt}>Next ›</Text>
          </Pressable>
        ) : (
          <View style={styles.toolBtn} />
        )}
        <Pressable
          style={styles.toolBtn}
          onPress={() => {
            if (!isPdf) addBookmark('bookmark');
            else saveProgress(String(startPage), percent);
          }}>
          <Text style={styles.toolTxt}>{isPdf ? 'Mark page' : 'Bookmark'}</Text>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={() => setShowSettings(true)}>
          <Text style={styles.toolTxt}>Aa</Text>
        </Pressable>
      </View>

      {/* Settings sheet */}
      <Modal visible={showSettings} transparent animationType="slide">
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowSettings(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Reading Settings</Text>

            <Text style={styles.label}>Font</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontRow}>
              {BENGALI_FONTS.map((f) => (
                <Pressable
                  key={f.id}
                  style={[
                    styles.fontChip,
                    settings.fontFamily === f.family && styles.fontChipActive,
                  ]}
                  onPress={() => settings.update({ fontFamily: f.family })}>
                  <Text
                    style={[
                      styles.fontChipTxt,
                      settings.fontFamily === f.family && styles.fontChipTxtActive,
                    ]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Stepper
              label="Font size"
              value={String(settings.fontSize)}
              onMinus={() => settings.update({ fontSize: Math.max(12, settings.fontSize - 1) })}
              onPlus={() => settings.update({ fontSize: Math.min(32, settings.fontSize + 1) })}
            />
            <Stepper
              label="Line spacing"
              value={settings.lineHeight.toFixed(1)}
              onMinus={() =>
                settings.update({ lineHeight: Math.max(1.2, +(settings.lineHeight - 0.1).toFixed(1)) })
              }
              onPlus={() =>
                settings.update({ lineHeight: Math.min(2.2, +(settings.lineHeight + 0.1).toFixed(1)) })
              }
            />
            <Stepper
              label="Margins"
              value={['Narrow', 'Medium', 'Wide'][settings.margin]}
              onMinus={() => settings.update({ margin: Math.max(0, settings.margin - 1) })}
              onPlus={() => settings.update({ margin: Math.min(2, settings.margin + 1) })}
            />

            <Text style={styles.label}>Theme</Text>
            <View style={styles.themeRow}>
              {READER_THEMES.map((t) => (
                <Pressable
                  key={t.id}
                  style={[
                    styles.themeBtn,
                    { backgroundColor: t.bg },
                    settings.theme === t.id && styles.themeBtnActive,
                  ]}
                  onPress={() => settings.update({ theme: t.id })}>
                  <Text style={[styles.themeBtnTxt, { color: t.fg }]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.closeBtn, { marginTop: 16 }]}
              onPress={() => setShowSettings(false)}>
              <Text style={styles.closeBtnTxt}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* TOC sheet */}
      <Modal visible={showToc} transparent animationType="slide">
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowToc(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Contents</Text>
            <ScrollView style={styles.tocScroll}>
              {renderToc(toc, (href) => {
                setShowToc(false);
                gotoRef.current?.(href);
              })}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => setShowToc(false)}>
              <Text style={styles.closeBtnTxt}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Selected-text action */}
      <Modal visible={!!pending} transparent animationType="fade">
        <Pressable style={styles.sheetBackdrop} onPress={() => setPending(null)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Save selection</Text>
            <Text style={styles.selText} numberOfLines={3}>
              {pending?.text}
            </Text>
            <Text style={styles.label}>Note (Avro typing available)</Text>
            <AvroInput
              style={styles.noteInput}
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Add a note..."
              multiline
            />
            <View style={styles.row}>
              <Pressable style={styles.actionBtn} onPress={() => addBookmark('highlight')}>
                <Text style={styles.actionBtnTxt}>Highlight</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => addBookmark('bookmark')}>
                <Text style={styles.actionBtnTxt}>Bookmark</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function renderToc(items: TocItem[], onPick: (href: string) => void) {
  return items.map((it) => (
    <View key={it.id}>
      <Pressable style={styles.tocItem} onPress={() => onPick(it.href)}>
        <Text style={styles.tocItemTxt}>{it.label || '—'}</Text>
      </Pressable>
      {it.subitems && it.subitems.length ? (
        <View style={styles.tocSub}>{renderToc(it.subitems, onPick)}</View>
      ) : null}
    </View>
  ));
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable style={styles.stepBtn} onPress={onMinus}>
          <Text style={styles.stepBtnTxt}>−</Text>
        </Pressable>
        <Text style={styles.stepVal}>{value}</Text>
        <Pressable style={styles.stepBtn} onPress={onPlus}>
          <Text style={styles.stepBtnTxt}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#fbf8f1',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.separator,
  },
  iconBtn: { padding: 8 },
  iconTxt: { fontSize: 26, color: AppColors.accent },
  titleWrap: { flex: 1, paddingHorizontal: 8 },
  title: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  pct: { fontSize: 13, color: AppColors.subtext, minWidth: 40, textAlign: 'right' },
  readerArea: { flex: 1 },
  bottomBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fbf8f1',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.separator,
  },
  toolBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  toolTxt: { fontSize: 15, color: AppColors.accent, fontWeight: '600' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: AppColors.text },
  label: { fontSize: 13, color: AppColors.subtext, marginTop: 12, marginBottom: 6 },
  fontRow: { flexDirection: 'row' },
  fontChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: AppColors.fieldBg,
    marginRight: 8,
  },
  fontChipActive: { backgroundColor: AppColors.accent },
  fontChipTxt: { color: AppColors.text, fontSize: 13 },
  fontChipTxtActive: { color: '#fff' },
  stepper: { marginTop: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 44,
    height: 40,
    borderRadius: 10,
    backgroundColor: AppColors.fieldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnTxt: { fontSize: 22, color: AppColors.accent },
  stepVal: { fontSize: 16, color: AppColors.text, minWidth: 60, textAlign: 'center' },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  themeBtn: {
    flex: 1,
    marginHorizontal: 4,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeBtnActive: { borderColor: AppColors.accent },
  themeBtnTxt: { fontSize: 13, fontWeight: '600' },
  closeBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnTxt: { color: '#fff', fontWeight: '700' },
  tocScroll: { maxHeight: 400 },
  tocItem: { paddingVertical: 10 },
  tocItemTxt: { fontSize: 15, color: AppColors.text },
  tocSub: { paddingLeft: 16 },
  selText: { fontSize: 14, color: AppColors.subtext, fontStyle: 'italic', marginBottom: 8 },
  noteInput: {
    backgroundColor: AppColors.fieldBg,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
    color: AppColors.text,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  actionBtn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnTxt: { color: '#fff', fontWeight: '700' },
  errorOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 70,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d9534f',
    zIndex: 50,
  },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#d9534f', marginBottom: 6 },
  errorMsg: { fontSize: 13, color: '#333', fontFamily: 'monospace' },
});
