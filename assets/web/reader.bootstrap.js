/* Direct chapter reader bootstrap (no epub.js dependency).
 * Reads chapter HTML from window.__boipoka.chapters and renders it.
 * Navigation via prev/next/settings/gotoChapter.
 * Web -> RN: postMessage JSON
 * RN -> Web: injectJavaScript calling window.__boipoka.*
 */
(function () {
  var current = 0;
  var chapters = [];
  var container = null;
  try { container = document.getElementById('viewer'); } catch (e) {}

  function post(msg) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    } catch (e) {}
  }

  function renderChapter(index) {
    if (!container || index < 0 || index >= chapters.length) return;
    current = index;
    var ch = chapters[index];
    container.innerHTML = ch;
    post({ type: 'ready', chapter: index + 1, total: chapters.length });
  }

  var hrefs = [];
  function init(payload) {
    try {
      chapters = payload.chapters || [];
      hrefs = payload.hrefs || [];
      if (payload.language) document.body.setAttribute('lang', payload.language);
      // Ensure content is visible: reset margins/padding and set box-sizing
      try {
        var style = document.createElement('style');
        style.textContent = '#viewer * { box-sizing: border-box; } #viewer p, #viewer div { margin: 0 0 1em 0; } #viewer img { max-width: 100%; height: auto; }';
        document.head.appendChild(style);
      } catch (e) {}
      renderChapter(payload.start || 0);
    } catch (e) {
      post({ type: 'error', message: 'init: ' + e.message });
    }
  }

  function next() {
    if (current + 1 < chapters.length) renderChapter(current + 1);
  }

  function prev() {
    if (current > 0) renderChapter(current - 1);
  }

  function gotoChapter(input) {
    var index = -1;
    if (typeof input === 'number') {
      index = input;
    } else if (typeof input === 'string' && hrefs.length) {
      var found = hrefs.indexOf(input);
      if (found < 0 && input.indexOf('#') >= 0) {
        found = hrefs.indexOf(input.split('#')[0]);
      }
      if (found >= 0) index = found;
    }
    if (index >= 0 && index < chapters.length) renderChapter(index);
  }

  function applySettings(s) {
    var theme = s.theme === 'dark' ? '#1c1c1e' : s.theme === 'sepia' ? '#f7ecd9' : '#ffffff';
    var fg = s.theme === 'dark' ? '#d8d8d8' : s.theme === 'sepia' ? '#5b4636' : '#1c1c1e';
    document.body.style.backgroundColor = theme;
    document.body.style.color = fg;
    var stack = s.fontFamily || 'Noto Sans';
    if (s.language === 'bengali' || s.language === 'bn') {
      stack = stack + ', "Noto Sans Bengali", "Hind Siliguri", "Noto Sans", sans-serif';
    } else {
      stack = stack + ', "Noto Sans", "Georgia", serif';
    }
    if (s.language === 'bengali' || s.language === 'bn') {
      document.body.style.fontFamily = '"' + stack + '", "Noto Sans Bengali", sans-serif';
    } else {
      document.body.style.fontFamily = '"' + stack + '", "Georgia", "Times New Roman", serif';
    }
    document.body.style.fontSize = s.fontSize + 'px';
    document.body.style.lineHeight = String(s.lineHeight);
    document.body.style.padding = [12, 44, 76][s.margin || 1] + 'px';
    document.body.style.wordBreak = 'break-word';
  }

  window.__boipoka = {
    init: init,
    next: next,
    prev: prev,
    gotoChapter: gotoChapter,
    applySettings: applySettings,
  };

  post({ type: 'webReady' });
})();
