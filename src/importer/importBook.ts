import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { uid } from '../utils/id';
import { base64ToUint8Array, uint8ToBase64 } from '../utils/base64';
import { ensureDirs, bookFilePath, coverFilePath } from '../utils/paths';
import { extractEpubMeta } from './metadata';
import {
  convertDocumentTextKeepTags,
  isContentFile,
  sampleLikelyBijoy,
} from './convertEpub';
import { insertBook } from '../db/repository';
import type { Book, BookFormat } from '../db/types';

function extOf(name: string): string {
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

function readFileBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function writeFileBase64(path: string, b64: string): Promise<void> {
  return FileSystem.writeAsStringAsync(path, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function prettyName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

export interface ImportOptions {
  /** Force Bijoy->Unicode conversion even if detection is unsure. */
  forceBijoy?: boolean;
  /** Override the picked file URI/name (used for shared files / tests). */
  uri?: string;
  name?: string;
}

export async function importBook(
  options: ImportOptions = {},
): Promise<Book | null> {
  let uri: string | undefined = options.uri;
  let name: string | undefined = options.name;

  if (!uri) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/epub+zip', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return null;
    uri = result.assets[0].uri;
    name = result.assets[0].name;
  }
  if (!uri) return null;

  const fileName = name ?? uri.split('/').pop() ?? 'book';
  const ext = extOf(fileName);
  const format: BookFormat = ext === 'pdf' ? 'pdf' : 'epub';

  await ensureDirs();
  const id = uid('bk_');
  const targetPath = bookFilePath(id, format);

  const originalB64 = await readFileBase64(uri);
  let finalB64 = originalB64;

  let title = prettyName(fileName);
  let author = '';
  let language: string | null = null;
  let coverPath: string | null = null;
  let bijoyConverted = 0;

  if (format === 'epub') {
    const zip = await JSZip.loadAsync(base64ToUint8Array(originalB64));
    const meta = await extractEpubMeta(zip);

    let needConvert = !!options.forceBijoy;
    if (!needConvert) {
      const contentFiles = Object.keys(zip.files)
        .filter((n) => isContentFile(n))
        .slice(0, 12);
      for (const rel of contentFiles) {
        const f = zip.file(rel);
        if (!f) continue;
        const txt = await f.async('string');
        if (sampleLikelyBijoy(txt)) {
          needConvert = true;
          break;
        }
      }
    }

    if (needConvert) {
      const newZip = new JSZip();
      await Promise.all(
        Object.keys(zip.files).map(async (rel) => {
          const f = zip.files[rel];
          if (!f || f.dir) return;
          if (isContentFile(rel)) {
            const txt = await f.async('string');
            newZip.file(rel, convertDocumentTextKeepTags(txt));
          } else {
            newZip.file(rel, await f.async('uint8array'));
          }
        }),
      );
      const out = await newZip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      finalB64 = uint8ToBase64(out);
      bijoyConverted = 1;
    }

    if (meta.coverHref) {
      const coverFile = zip.file(meta.coverHref);
      if (coverFile) {
        const bytes = await coverFile.async('uint8array');
        await writeFileBase64(coverFilePath(id), uint8ToBase64(bytes));
        coverPath = coverFilePath(id);
      }
    }

    title = meta.title || title;
    author = meta.author;
    language = meta.language;
  }

  await writeFileBase64(targetPath, finalB64);

  const book: Book = {
    id,
    title,
    author,
    coverPath,
    filePath: targetPath,
    format,
    addedAt: Date.now(),
    lastReadAt: null,
    progress: 0,
    progressCfi: null,
    collectionId: null,
    bijoyConverted: bijoyConverted as 0 | 1,
    language,
  };
  await insertBook(book);
  return book;
}
