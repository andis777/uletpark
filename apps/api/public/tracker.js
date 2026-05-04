/*!
 * Улётная Tracker — собственная метрика сайта uletnayaparkovka.ru
 * Шлёт события на /api/events. Уважает Do-Not-Track и localStorage opt-out.
 *
 * Установка на сайте:
 *   <script async src="https://api.uletnayaparkovka.ru/tracker.js"
 *           data-api="https://api.uletnayaparkovka.ru"
 *           data-site="uletnayaparkovka.ru"></script>
 *
 * Размер: ~3 КБ minified. Без зависимостей.
 */
(function () {
  if (window.__upTrackerLoaded) return;
  window.__upTrackerLoaded = true;

  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

  var API = (script && script.getAttribute('data-api')) || '';
  if (!API) return;
  var SITE = (script && script.getAttribute('data-site')) || location.hostname;

  // --- DNT / opt-out ---
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  try { if (localStorage.getItem('up_optout') === '1') return; } catch (e) {}

  // --- Session ID ---
  var SESSION_KEY = 'up_session';
  var SESSION_TTL = 30 * 60 * 1000;
  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (Date.now() - s.last < SESSION_TTL) {
          s.last = Date.now();
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
          return s.id;
        }
      }
    } catch (e) {}
    var id = 's_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: id, last: Date.now() })); } catch (e) {}
    return id;
  }

  var sessionId = getSession();

  // --- Device info ---
  function deviceInfo() {
    return {
      site: SITE,
      lang: (navigator.language || '').slice(0, 5),
      screen: window.screen.width + 'x' + window.screen.height,
      vp: window.innerWidth + 'x' + window.innerHeight,
      ref: document.referrer || null,
      ua_lite: (navigator.userAgent || '').slice(0, 120),
    };
  }

  // --- Queue + send (sendBeacon when leaving page) ---
  var queue = [];
  var SEND_DELAY = 800;
  var sendTimer = null;

  function flush(beacon) {
    if (queue.length === 0) return;
    var batch = queue.splice(0, queue.length);
    var body = JSON.stringify(batch);
    var url = API + '/api/events';

    if (beacon && navigator.sendBeacon) {
      var blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      try {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true,
        }).catch(function () {});
      } catch (e) {}
    }
  }

  function track(name, props) {
    if (!name) return;
    queue.push({
      eventName: name,
      sessionId: sessionId,
      source: 'web',
      url: location.pathname + location.search,
      properties: props || {},
      deviceInfo: deviceInfo(),
    });
    if (sendTimer) clearTimeout(sendTimer);
    sendTimer = setTimeout(function () { flush(false); }, SEND_DELAY);
  }

  window.upTrack = track;

  // --- Auto-events ---

  // 1. page_view + время на странице
  var pageStart = Date.now();
  track('page_view', { title: document.title.slice(0, 200) });

  // 2. SPA-навигация (popstate + pushState/replaceState patch)
  ['pushState', 'replaceState'].forEach(function (m) {
    var orig = history[m];
    history[m] = function () {
      var rv = orig.apply(this, arguments);
      track('page_view', { title: document.title.slice(0, 200), spa: true });
      pageStart = Date.now();
      return rv;
    };
  });
  window.addEventListener('popstate', function () { track('page_view', { title: document.title.slice(0, 200), spa: true }); });

  // 3. Скролл-глубина (25/50/75/100)
  var scrollMarks = { 25: 0, 50: 0, 75: 0, 100: 0 };
  function onScroll() {
    var h = document.documentElement;
    var st = h.scrollTop || document.body.scrollTop;
    var sh = h.scrollHeight - h.clientHeight;
    if (sh <= 0) return;
    var pct = Math.round((st / sh) * 100);
    [25, 50, 75, 100].forEach(function (m) {
      if (pct >= m && !scrollMarks[m]) {
        scrollMarks[m] = 1;
        track('scroll_depth', { pct: m });
      }
    });
  }
  var scrollTimer;
  window.addEventListener('scroll', function () {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () { scrollTimer = null; onScroll(); }, 200);
  });

  // 4. Клики по CTA / ссылкам с data-track
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document.body) {
      // Явная разметка: <a data-track="cta-book">
      if (t.dataset && t.dataset.track) {
        track('click', { id: t.dataset.track, text: (t.textContent || '').trim().slice(0, 60) });
        return;
      }
      // Telegram / WhatsApp / tel:
      if (t.tagName === 'A' && t.href) {
        if (t.href.indexOf('tel:') === 0) { track('click_phone', { href: t.href }); return; }
        if (t.href.indexOf('mailto:') === 0) { track('click_email', { href: t.href }); return; }
        if (t.href.indexOf('t.me/') > -1 || t.href.indexOf('telegram.me/') > -1) { track('click_telegram'); return; }
        if (t.href.indexOf('wa.me/') > -1 || t.href.indexOf('whatsapp.com') > -1) { track('click_whatsapp'); return; }
      }
      // Кнопки бронирования по тексту (fallback)
      if (t.tagName === 'BUTTON' || t.tagName === 'A') {
        var txt = (t.textContent || '').toLowerCase();
        if (txt.indexOf('забронировать') > -1) { track('booking_started'); return; }
        if (txt.indexOf('рассчитать') > -1) { track('calc_started'); return; }
      }
      t = t.parentElement;
    }
  }, { passive: true });

  // 5. Время на странице при выходе
  window.addEventListener('beforeunload', function () {
    track('page_exit', { dwellMs: Date.now() - pageStart });
    flush(true);
  });

  // 6. visibilitychange — если ушёл во вкладку
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) flush(true);
  });

  // 7. Public API: opt-out
  window.upOptOut = function () {
    try { localStorage.setItem('up_optout', '1'); } catch (e) {}
  };
  window.upOptIn = function () {
    try { localStorage.removeItem('up_optout'); } catch (e) {}
  };
})();
