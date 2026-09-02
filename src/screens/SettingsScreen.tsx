import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../store/settingsStore';
import { READER_FONTS, READER_THEMES, fontsByKind, defaultFontForKind } from '../fonts/fonts';
import { useImportBook } from '../utils/useImport';
import { AppColors } from '../theme';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const settings = useSettings();
  const importBook = useImportBook();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.group}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Avro phonetic typing</Text>
          <Switch
            value={!!settings.avroInput}
            onValueChange={(v) => settings.update({ avroInput: v ? 1 : 0 })}
            trackColor={{ true: AppColors.accent }}
          />
        </View>
        <Text style={styles.hint}>
          When on, type romanized Bengali (e.g. "ami") and it becomes "আমি" in
          search and notes.
        </Text>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Default reading theme</Text>
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
      </View>

      <Pressable
        style={styles.linkRow}
        onPress={() => navigation.navigate('Bookmarks')}>
        <Text style={styles.linkTxt}>Bookmarks & Notes</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <View style={styles.group}>
        <Text style={styles.label}>Import books</Text>
        <Pressable style={styles.btn} onPress={() => importBook()}>
          <Text style={styles.btnTxt}>Import EPUB / PDF</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { marginTop: 8 }]}
          onPress={() => importBook({ forceBijoy: true })}>
          <Text style={styles.btnTxt}>Import as Bijoy (force convert)</Text>
        </Pressable>
        <Text style={styles.hint}>
          Bijoy-encoded Bengali books are auto-detected and converted to Unicode
          on import. Use "force convert" only if detection misses a book.
        </Text>
      </View>

      <Text style={styles.about}>
        Boipoka — a Bengali e-book reader. Supports Unicode Bengali fonts,
        legacy Bijoy conversion, and Avro phonetic input.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.bg },
  content: { padding: 20 },
  heading: { fontSize: 28, fontWeight: '800', color: AppColors.text, marginBottom: 12 },
  group: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, fontWeight: '600', color: AppColors.text },
  hint: { fontSize: 13, color: AppColors.subtext, marginTop: 8 },
  themeRow: { flexDirection: 'row', marginTop: 12 },
  themeBtn: {
    flex: 1,
    marginRight: 8,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeBtnActive: { borderColor: AppColors.accent },
  themeBtnTxt: { fontSize: 13, fontWeight: '600' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  linkTxt: { fontSize: 16, fontWeight: '600', color: AppColors.text },
  chevron: { fontSize: 22, color: AppColors.subtext },
  btn: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontWeight: '700' },
  about: { fontSize: 12, color: AppColors.subtext, marginTop: 8, textAlign: 'center' },
});
