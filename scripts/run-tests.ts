import JSZip from 'jszip';
import { extractEpubMeta } from '../src/importer/metadata';
import {
  convertDocumentTextKeepTags,
  sampleLikelyBijoy,
} from '../src/importer/convertEpub';
import {
  isLikelyBijoy,
  containsUnicodeBengali,
} from '../src/bengali/detect';
import { bijoyToUnicode } from '../src/bengali/bijoy';
import { avroToBengali } from '../src/bengali/avro';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`, extra ?? '');
  }
}

const BENOBS = 'BijoyEPUBTest';

async function main() {
  // Build a minimal EPUB whose chapter text is encoded in legacy Bijoy.
  const bj =
    'Avgvi ' +
    '\u2020' +
    'mvbvi evsjv, Avwg ' +
    '\u2020' +
    'Zvgvq fv' +
    '\u2021' +
    'jvevwm|';
  const chapter = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Ch</title></head>
<body><p>${bj}</p><script>var raw = '${bj}';</script></body></html>`;
  const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf"><metadata>
<dc:title>Amader Sonar Bangla</dc:title>
<dc:creator>Test Author</dc:creator>
<dc:language>bn</dc:language>
<meta name="cover" content="coverimg"/>
</metadata><manifest>
<item id="c1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
<item id="coverimg" href="cover.png" media-type="image/png"/>
</manifest></package>`;
  const container = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles>
<rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`;

  const zip = new JSZip();
  zip.file('META-INF/container.xml', container);
  zip.file('OEBPS/content.opf', opf);
  zip.file('OEBPS/chapter1.xhtml', chapter);
  zip.file('OEBPS/cover.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  const buf = await zip.generateAsync({ type: 'uint8array' });

  console.log('Bengali detection + conversion:');
  const chText = chapter;
  check('isLikelyBijoy(chapter) true', isLikelyBijoy(chText) === true);
  check('sampleLikelyBijoy(chapter) true', sampleLikelyBijoy(chText) === true);
  check('containsUnicodeBengali(chapter) false', containsUnicodeBengali(chText) === false);

  const converted = convertDocumentTextKeepTags(chText);
  check('converted has Unicode Bengali', containsUnicodeBengali(converted) === true);
  check('converted no longer Bijoy', isLikelyBijoy(converted) === false);
  // script content must be preserved verbatim (not converted)
  check('script body preserved', converted.includes(`var raw = '${bj}'`));

  console.log('EPUB metadata extraction:');
  const zip2 = await JSZip.loadAsync(buf);
  const meta = await extractEpubMeta(zip2);
  check('title extracted', meta.title === 'Amader Sonar Bangla', meta.title);
  check('author extracted', meta.author === 'Test Author', meta.author);
  check('language extracted', meta.language === 'bn', meta.language);
  check('cover href resolved', meta.coverHref === 'OEBPS/cover.png', meta.coverHref);

  console.log('Unit conversions:');
  check(
    'bijoyToUnicode works',
    containsUnicodeBengali(bijoyToUnicode(bj)) === true,
  );
  const avroOut = avroToBengali('ami banglay likhi');
  check('avroToBengali produces Bengali', containsUnicodeBengali(avroOut) === true);
  check('avroToBengali changes text', avroOut !== 'ami banglay likhi');

  console.log(`\n${BENOBS}: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
