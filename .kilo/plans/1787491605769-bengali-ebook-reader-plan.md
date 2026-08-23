# Bengali E-Book Reader (Apple Books–style, React Native)

## Goal
A cross-platform (Android + iOS) e-book reader that mirrors the core Apple Books
experience, with first-class Bengali support: it must correctly display Bengali
books that were authored in the **legacy Bijoy encoding** (by converting them to
Unicode at import) and offer **Avro phonetic typing** for user-entered text
(search, notes, bookmark titles), plus a choice of Bengali Unicode fonts.

## Locked Decisions (from planning interview)
1. **Framework:** React Native (single JS/TS codebase).
2. **Tooling:** Expo (SDK + EAS). Target **EAS Development Builds**, not Expo Go
   (native PDF module requires it — see Risks).
3. **Content source:** Local import only. No backend/store. (Repository layer
   kept clean so a backend can be added later.)
4. **Formats:** EPUB (reflowable) + PDF (incl. scanned Bengali books).
5. **EPUB engine:** Render inside a React Native WebView via `epub.js`. The
   browser engine gives correct Bengali complex-script shaping and full control
   over custom `@font-face` fonts.
6. **Bengali handling:** Convert Bijoy→Unicode at import; bundle Unicode Bengali
   fonts; provide Avro phonetic input for user text.
7. **v1 scope:** Core Apple Books feature set (below).

## Core Feature Set (v1)
- **Library tab:** Grid of book covers grouped into shelves/collections
  ("Reading Now" carousel + "Library" grid by Collections, Authors, Titles).
- **Import:** `expo-document-picker` to import `.epub` / `.pdf` from device/cloud.
  Extract metadata + cover (EPUB) and add to library.
- **Reader (EPUB):** WebView + epub.js; tap zones, swipe pages, progress.
- **Reader (PDF):** Native PDF viewer (scanned Bengali books render as images).
- **Table of Contents** + in-book **search** (EPUB).
- **Reading settings:** font family (incl. Bengali fonts), font size, line
  spacing, margin, and theme (Light / Sepia / Dark).
- **Bookmarks, Highlights, Notes** (EPUB), persisted and shown in a list.
- **Reading progress** (CFI / percent), resume where left off.
- **Library search** (title/author) + **Avro phonetic typing** in all search and
  text-input fields (toggle).

## Architecture
- **Navigation:** React Navigation — bottom tabs (Reading Now, Library, Search,
  Settings) + stack/modal for Reader, Book Details, Collection view.
- **State:** Zustand for UI/app state (library list, settings, active reader).
- **Data access:** Repository module over SQLite (see Data Model). UI never
  touches the DB directly.
- **Storage:** `expo-file-system` DocumentDirectory for imported books and
  extracted covers. Unzipped EPUB assets served to the WebView via a local
  `expo-webview` bridge / copied into the WebView-accessible cache.

## Key Libraries
- `expo`, `react-native`, `expo-document-picker`, `expo-file-system`,
  `expo-sqlite` (or `@op-engineering/op-sqlite`), `react-navigation`.
- `epub.js` (EPUB rendering in WebView).
- `jszip` (unzip EPUB in the RN JS thread to extract OPF/NCX metadata + cover).
- `react-native-pdf` (+ Expo config plugin) — PDF viewing; needs a dev build.
- `bengali-converter` (npm) — Bijoy↔Unicode conversion **and** Avro phonetic
  `toBengali()`. Fallback options: `bijoy-to-unicode` + `avro-phonetic`.
- Bundled Bengali Unicode fonts: **Noto Sans Bengali, SolaimanLipi, Kalpurush,
  Siyam Rupali, Ekushey** (place in `assets/fonts/`, register via
  `expo-font` / `react-native.config.js` for native, and via `@font-face` inside
  the WebView for epub.js).

## Bengali / Bijoy / Avro Handling (critical detail)
- **Bijoy → Unicode (EPUB import / render):**
  - Bijoy is a legacy non-Unicode encoding (English-gibberish bytes). Detect it
    by scanning text for Bijoy-specific ASCII patterns and the *absence* of the
    Unicode Bengali range (U+0980–U+09FF).
  - Convert in the epub.js **content hook** (`rendition.hooks.content.register`):
    walk text nodes of each chapter, run `bengali-converter` Bijoy→Unicode,
    preserve all tags/attributes. This keeps search, copy, and highlights correct.
  - PDFs are not converted (scanned images render as-is; embedded-text PDFs with
    Bijoy encoding are a known limitation — noted in Risks).
- **Bengali fonts:** Provide the bundled Unicode fonts as reader font choices.
  Apply via WebView `@font-face` + CSS so epub.js chapters use them. Default to
  Noto Sans Bengali.
- **Avro input:** Add an "Avro typing" toggle on search/notes/bookmark-title
  inputs. On each keystroke, pipe the romanized buffer through
  `bengali-converter` Avro `toBengali()` to produce Bengali. Persist the final
  Bengali string.

## Data Model (SQLite)
- `books(id, title, author, cover_path, file_path, format['epub'|'pdf'],
  added_at, last_read_at, progress, progress_cfi, collection_id)`
- `bookmarks(id, book_id, location, type['bookmark'|'highlight'],
  color, note, created_at)`  (location = EPUB CFI or PDF page)
- `collections(id, name)`
- `settings(key, value)`  (theme, font family, font size, spacing, margin, avro toggle)

## Project Structure (proposed)
```
app/                 # Expo Router or screens/ (per chosen nav)
  (tabs)/            # ReadingNow, Library, Search, Settings
  reader/            # EPUB WebView reader + PDF reader
  book/              # Book details, collections
src/
  db/                # sqlite schema + repository
  epub/              # epub.js wrapper, content hook (Bijoy converter)
  pdf/               # PDF viewer wrapper
  bengali/           # bengali-converter wrappers (bijoyToUnicode, avroToBengali)
  fonts/             # font registry + @font-face injection
  importer/          # document picker, metadata extraction, cover
  store/             # zustand stores
assets/fonts/        # bundled Bengali fonts
assets/web/          # reader HTML/JS injected into WebView
```

## Implementation Task List (ordered)
1. **Scaffold:** `npx create-expo-app` (TS), install deps, configure
   `app.json`/`eas.json` for a dev build, add `react-native-pdf` config plugin.
2. **Storage + DB:** `expo-file-system` dirs; `expo-sqlite` schema + repository
   (books, bookmarks, collections, settings).
3. **Importer:** `expo-document-picker` → copy to docs; EPUB metadata/cover via
   `jszip` (OPF/NCX); PDF → filename title, generic cover. Insert into DB.
4. **Library UI:** tabs, shelves/collections, cover grid, book details, delete.
5. **EPUB reader:** WebView + epub.js wrapper; open from ArrayBuffer; render;
   progress CFI save/resume; TOC; in-book search.
6. **Bengali layer:** `bengali/ ` wrappers; Bijoy→Unicode in epub.js content hook;
   `@font-face` font injection (bundled Bengali fonts); Avro toggle on inputs.
7. **PDF reader:** `react-native-pdf` viewer; page-based progress/bookmarks.
8. **Reading settings:** font family/size, spacing, margin, theme (Light/Sepia/Dark).
9. **Bookmarks / Highlights / Notes** (EPUB) + list view; library search.
10. **Polish:** Apple Books aesthetic (shelf shadows, tab bar, animations),
    empty states, permissions.

## Risks / Constraints
- **EAS dev build required** (not Expo Go) because `react-native-pdf` is a native
  module. State this clearly in README/onboarding.
- **Bijoy detection is heuristic**; mis-encoded books may need manual "re-encode"
  toggle. Provide a per-book "Bijoy source" switch if auto-detect fails.
- **PDF text in Bijoy encoding** can't be reliably converted (usually scanned
  images anyway). Acceptable limitation for v1.
- **WebView ↔ RN bridge** for CFI/progress/bookmarks must be robust (postMessage).
- Bengali shaping depends on the bundled font having proper OpenType tables;
  Noto Sans Bengali is the safe default.

## Validation / Testing
- Import a known **Unicode Bengali EPUB**, a known **Bijoy-encoded EPUB**, and a
  **scanned Bengali PDF**; confirm all render correctly with chosen fonts.
- Toggle Avro input; type romanized text in search/notes → verify Bengali output.
- Verify bookmarks/highlights/notes persist across app restarts.
- Verify resume-progress (close + reopen book).
- Run on both Android and iOS dev builds; check Light/Sepia/Dark themes and font
  sizing/line spacing.

## Open Questions (non-blocking)
- Exact bundled font list / licensing (confirm all are freely redistributable).
- Whether to also expose a "Bijoy legacy font" fallback later (deferred per decision 6).
