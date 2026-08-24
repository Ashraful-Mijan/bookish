import { bijoyToUnicode } from '../bengali';
import { isLikelyBijoy } from '../bengali/detect';

const CONTENT_EXT = /\.(x?html?|ncx|opf|xpgt|svg)$/i;

export function isContentFile(name: string): boolean {
  return CONTENT_EXT.test(name);
}

/**
 * Convert Bijoy-encoded text inside an (X)HTML/NCX/OPF document to Unicode,
 * while preserving all markup. Text inside <script> and <style> elements is
 * left untouched, and attribute values are never touched because they live
 * inside tag tokens.
 */
export function convertDocumentTextKeepTags(html: string): string {
  const tokenRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|([^<]+)/g;
  let result = '';
  let skipDepth = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(html)) !== null) {
    if (m[1] !== undefined) {
      const tag = m[1].toLowerCase();
      if (tag === 'script' || tag === 'style') {
        if (m[0].startsWith('</')) skipDepth = Math.max(0, skipDepth - 1);
        else skipDepth++;
      }
      result += m[0];
    } else {
      const text = m[2];
      result += skipDepth > 0 ? text : bijoyToUnicode(text);
    }
  }
  return result;
}

/** Sample a few text nodes from a document to decide if it is Bijoy-encoded. */
export function sampleLikelyBijoy(html: string): boolean {
  // Strip tags to get a coarse text sample, then run the heuristic.
  const text = html.replace(/<[^>]+>/g, ' ').slice(0, 4000);
  return isLikelyBijoy(text);
}
