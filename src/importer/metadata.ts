import JSZip from 'jszip';

export interface EpubMeta {
  title: string;
  author: string;
  language: string | null;
  coverHref: string | null; // package-relative path
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(parseInt(d, 10)));
}

function firstMatch(xml: string, re: RegExp): string {
  const m = xml.match(re);
  return m ? decodeEntities(m[1].trim()) : '';
}

function resolveRelative(basePath: string, href: string): string {
  if (href.startsWith('/')) return href.slice(1);
  const parts = basePath.split('/');
  parts.pop();
  for (const seg of href.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

export async function extractEpubMeta(zip: JSZip): Promise<EpubMeta> {
  let opfPath = 'OEBPS/content.opf';
  const containerFile = zip.file('META-INF/container.xml');
  if (containerFile) {
    const container = await containerFile.async('string');
    const m =
      container.match(/full-path="([^"]+)"/i) ||
      container.match(/full-path='([^']+)'/i);
    if (m) opfPath = m[1];
  } else {
    const found = Object.keys(zip.files).find((n) => /\.opf$/i.test(n));
    if (found) opfPath = found;
  }

  const opfFile = zip.file(opfPath);
  const opf = opfFile ? await opfFile.async('string') : '';

  const title =
    firstMatch(opf, /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i) ||
    firstMatch(opf, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
    'Untitled';
  const author = firstMatch(opf, /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
  const language =
    firstMatch(opf, /<dc:language[^>]*>([\s\S]*?)<\/dc:language>/i) || null;

  let coverHref: string | null = null;
  const metaCover =
    opf.match(/<meta[^>]+name=["']cover["'][^>]+content=["']([^"']+)["']/i) ||
    opf.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']cover["']/i);
  const coverId = metaCover ? metaCover[1] : null;
  if (coverId) {
    const itemM =
      opf.match(
        new RegExp(
          `<item[^>]+id=["']${coverId}["'][^>]+href=["']([^"']+)["']`,
          'i',
        ),
      ) ||
      opf.match(
        new RegExp(
          `<item[^>]+href=["']([^"']+)["'][^>]+id=["']${coverId}["']`,
          'i',
        ),
      );
    if (itemM) coverHref = itemM[1];
  }
  if (!coverHref) {
    const propM =
      opf.match(
        /<item[^>]+properties=["']cover-image["'][^>]+href=["']([^"']+)["']/i,
      ) ||
      opf.match(
        /<item[^>]+href=["']([^"']+)["'][^>]+properties=["']cover-image["']/i,
      );
    if (propM) coverHref = propM[1];
  }
  if (coverHref) coverHref = resolveRelative(opfPath, coverHref);

  return { title, author, language, coverHref };
}
