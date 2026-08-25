/* Generates assets/web/reader.html.
 * epub.js is loaded from the jsDelivr CDN (reliable UMD global `ePub`),
 * and the reader bootstrap is inlined. This avoids bundling/UMD quirks of
 * an inlined copy and keeps the engine load deterministic. Network is
 * already required for Google Fonts in this app.
 * Run via `postinstall`. */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'assets', 'web');

function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

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
<script src="https://cdn.jsdelivr.net/npm/epubjs/dist/epub.js"></script>
<script>${bootstrapSrc}</script>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'reader.html'), html, 'utf8');
  console.log('[copy-web-deps] wrote assets/web/reader.html (CDN epub.js)');
}

main();
