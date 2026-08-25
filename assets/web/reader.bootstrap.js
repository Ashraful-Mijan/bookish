/* Reader bootstrap (browser context).
 * Web -> RN: window.ReactNativeWebView.postMessage(JSON.stringify(msg))
 * RN -> Web: window.__boipoka.init / applySettings / goto (injected via injectJavaScript) */
(function () {
  var book = null;
  var rendition = null;
  var pendingSettings = null;
  var THEMES = {
    light: { bg: '#ffffff', fg: '#1c1c1e' },
    sepia: { bg: '#f7ecd9', fg: '#5b4636' },
    dark: { bg: '#1c1c1e', fg: '#d8d8d8' },
  };

  function post(msg) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    } catch (e) {}
  }

  function base64ToUint8Array(b64) {
    var binary = atob(b64);
    var len = binary.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function marginPx(level) {
    var arr = [12, 44, 76];
    return arr[Math.max(0, Math.min(2, level))];
  }

  function applySettings(s) {
    if (!rendition) { pendingSettings = s; return; }
    var theme = THEMES[s.theme] || THEMES.light;
    var css = {
      body: {
        'background-color': theme.bg,
        color: theme.fg,
        'font-family': '"' + s.fontFamily + '", "Noto Sans Bengali", serif',
        'font-size': s.fontSize + 'px',
        'line-height': String(s.lineHeight),
        padding: marginPx(s.margin) + 'px',
        'word-break': 'break-word',
        margin: '0'
      },
      p: { 'text-align': 'justify', margin: '0 0 1em 0' },
      a: { color: 'inherit' },
      img: { 'max-width': '100%' }
    };
    try {
      rendition.themes.register('applied', css);
      rendition.themes.select('applied');
      document.body.style.backgroundColor = theme.bg;
    } catch (e) {
      post({ type: 'error', message: 'applySettings: ' + e.message });
    }
  }

  function buildToc(nav) {
    function walk(items) {
      return (items || []).map(function (it) {
        return { id: it.id, label: (it.label || '').trim(), href: it.href, subitems: walk(it.subitems) };
      });
    }
    return walk(nav.toc);
  }

  function init(payload) {
    try {
      if (typeof ePub === 'undefined') {
        post({ type: 'error', message: 'epub.js engine not loaded (ePub undefined). Check network/CDN access.' });
        return;
      }
      var bytes = base64ToUint8Array(payload.base64);
      book = ePub(bytes);
      rendition = book.renderTo('viewer', {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: 'paginated',
        allowScriptedContent: true
      });

      rendition.on('relocated', function (location) {
        var percent = 0;
        try {
          if (location && location.start && typeof location.start.percentage === 'number') {
            percent = location.start.percentage;
          } else if (book.locations && book.locations.total) {
            percent = book.locations.percentageFromCfi(location.start.cfi) || 0;
          }
        } catch (e) {}
        post({ type: 'progress', cfi: location.start.cfi, percent: percent, href: location.start.href });
      });

      rendition.on('selected', function (cfiRange, contents) {
        var text = '';
        try { text = contents.window.getSelection().toString(); } catch (e) {}
        post({ type: 'selected', cfi: cfiRange, text: text });
      });

      if (pendingSettings) { applySettings(pendingSettings); pendingSettings = null; }
      else if (payload.settings) applySettings(payload.settings);

      book.ready.then(function () {
        return book.locations.generate(1000);
      }).catch(function () {}).then(function () {
        if (payload.cfi) rendition.display(payload.cfi);
        else rendition.display();
        return book.loaded.navigation;
      }).then(function (nav) {
        post({ type: 'toc', items: buildToc(nav) });
        post({ type: 'ready' });
      }).catch(function (e) {
        post({ type: 'error', message: 'book.ready: ' + (e && e.message) });
      });
    } catch (e) {
      post({ type: 'error', message: 'init: ' + e.message });
    }
  }

  window.__boipoka = {
    init: init,
    applySettings: applySettings,
    goto: function (href) { if (rendition && href) rendition.display(href); }
  };

  post({ type: 'webReady' });
})();
