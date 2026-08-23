# Boipoka — Bengali E-Book Reader

A cross-platform (Android + iOS) e-book reader built with **React Native + Expo**,
inspired by Apple Books, with first-class **Bengali** support:

- Reads **EPUB** (reflowable) and **PDF** books.
- **Legacy Bijoy → Unicode conversion** on import, so old Bijoy-encoded Bengali
  books display correctly with modern Unicode fonts and remain searchable.
- **Avro phonetic input** for user text (search, notes) — type `ami` and get `আমি`.
- Adjustable Bengali fonts, size, line spacing, margins, and Light / Sepia /
  Dark themes.
- Bookmarks, highlights, notes, reading progress, table of contents, and library
  search.

## Tech stack

| Concern        | Choice |
| -------------- | ------ |
| Framework      | React Native (Expo SDK 52) |
| EPUB rendering | `epub.js` inside a React Native `WebView` |
| PDF rendering  | `react-native-pdf` (native module → needs a dev build) |
| Bengali (Bijoy) | `bn-ansi-to-unicode` |
| Bengali (Avro)  | `nodejs-avro-phonetic` |
| Storage        | `expo-sqlite` (books, bookmarks, collections, settings) |
| Import         | `expo-document-picker` + `jszip` (metadata/cover + Bijoy conversion) |
| State          | `zustand` |
| Navigation     | React Navigation (bottom tabs + stack) |

## Getting started

> **Requires a development build (not Expo Go).** `react-native-pdf` is a native
> module, so the app must be built with EAS or locally. See "Building" below.

```bash
npm install
npx expo install expo-dev-client   # only needed once
```

### Run on a simulator / device (development build)

```bash
# iOS simulator
npm run ios
# Android emulator / device
npm run android
```

The first time, EAS will build a development client. Alternatively build it once:

```bash
eas build --profile development
```

### Build production

```bash
eas build --profile production
eas submit --profile production
```

## How Bengali support works

### Bijoy → Unicode (at import)
Many Bengali EPUBs/PDFs are encoded with the legacy **Bijoy (ANSI)** encoding.
During import (`src/importer/importBook.ts`) the EPUB is unzipped, sampled, and —
if Bijoy is detected (`src/bengali/detect.ts`) — every XHTML/NCX/OPF document's
text is converted to Unicode via `src/importer/convertEpub.ts` (tag-preserving,
so markup and `<script>`/`<style>` contents are untouched). The converted book is
stored and rendered normally, which keeps search, copy, and highlights correct.

If auto-detection misses a book, force conversion from **Settings → Import as
Bijoy**.

### Avro phonetic input
When **Settings → Avro phonetic typing** is on, any `AvroInput` field converts
romanized text to Bengali as you type (search box, note field). The conversion
lives in `src/bengali/avro.ts`.

## Fonts

The reader loads Unicode Bengali fonts from Google Fonts (Noto Sans Bengali,
Hind Siliguri, Tiro Bangla, Mukta, Galada) so it works out of the box. To use the
classic **SolaimanLipi** / **Kalpurush** fonts offline, drop the `.ttf` files into
`assets/fonts/` and reference them (the reader `@font-face` block in
`assets/web/reader.bootstrap.js` can be extended to register local fonts).

## Project structure

```
src/
  bengali/        Bijoy + Avro conversion, detection
  db/             SQLite schema + repository
  importer/       document import, EPUB metadata, Bijoy conversion
  epub/           EpubReader (WebView + epub.js bridge)
  pdf/            PdfReader wrapper
  fonts/          font + theme registry
  store/          zustand settings store
  screens/        ReadingNow, Library, Search, Settings, BookDetails, Reader, Bookmarks
  components/     BookCover, AvroInput, BookCard
  navigation/     AppNavigator (tabs + stack)
assets/web/       reader.html (generated), reader.bootstrap.js
scripts/          copy-web-deps.js (inlines epub.js into reader.html), run-tests.ts
```

`assets/web/reader.html` is **generated** by `scripts/copy-web-deps.js` (run via
`postinstall`). It inlines `epub.js` and the reader bootstrap so the WebView needs
no network for the engine.

## Tests

Pure-logic tests (Bijoy detection/conversion, EPUB metadata, Avro) run on Node:

```bash
npm test
```

## Notes & limitations

- **Scanned PDFs** render as images; embedded-text PDFs in Bijoy encoding can't be
  reliably converted (acceptable — most are scans).
- **In-book search** (epub.js search) and **audiobooks** are out of scope for v1.
- The full native toolchain (Expo/RN) is required to run on a device; this repo
  ships source only.
