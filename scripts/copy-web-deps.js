/* Copies epub.js (from node_modules) and the reader bootstrap into a single
 * self-contained assets/web/reader.html so the EPUB reader WebView works
 * offline with no relative-asset resolution issues. Run via `postinstall`. */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const nodeModules = path.join(root, 'node_modules');
const outDir = path.join(root, 'assets', 'web');

function findEpubJs() {
  const candidates = [
    'epubjs/dist/epub.js',
    'epubjs/dist/epub.min.js',
    'epubjs/dist/epub.esm.js',
  ];
  for (const c of candidates) {
    const p = path.join(nodeModules, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const epubPath = findEpubJs();
  if (!epubPath) {
    console.warn('[copy-web-deps] epubjs not found; reader.html not generated.');
    return;
  }
  const epubSrc = fs.readFileSync(epubPath, 'utf8');
  const bootstrapPath = path.join(outDir, 'reader.bootstrap.js');
  const bootstrapSrc = fs.readFileSync(bootstrapPath, 'utf8');

  const googleFonts =
    'Noto+Sans+Bengali&family=Hind+Siliguri&family=Tiro+Bangla&family=Mukta&family=Galada';

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Boipoka Reader</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=${googleFonts}&display=swap" rel="stylesheet" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #ffffff; }
  #viewer { height: 100vh; width: 100vw; overflow: hidden; }
  ::selection { background: #b3d4ff; }
</style>
</head>
<body>
<div id="viewer"></div>
<script>${epubSrc}</script>
<script>${bootstrapSrc}</script>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'reader.html'), html, 'utf8');
  console.log('[copy-web-deps] wrote assets/web/reader.html');
}

main();
