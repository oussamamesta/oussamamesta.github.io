// Fidous offline: keeps the app and its libraries on the phone so it opens without internet.
// The page itself is fetched fresh when online (so updates arrive), and served from the phone when not.
// Your data does not go through here: Firestore keeps its own offline copy and syncs when you are back online.
var VERSION = /*VERSION*/'66cb6f9c60'/*END*/;
var CACHE = 'fidous-' + VERSION;
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192-v2.png', 'icon-512-v2.png', 'apple-touch-icon-v2.png',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'];
var LIBS = /^https:\/\/(cdnjs\.cloudflare\.com|unpkg\.com|www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('fidous-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  var url = r.url, same = url.indexOf(self.location.origin) === 0;
  // The app page: network first (with a short wait), the saved copy when offline.
  if (r.mode === 'navigate') {
    e.respondWith(new Promise(function (resolve) {
      var done = false, fallback = function () { if (done) return; done = true; caches.match('index.html').then(function (m) { resolve(m || Response.error()); }); };
      var t = setTimeout(fallback, 4000);
      fetch(r).then(function (res) {
        if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put('index.html', copy); }); }
        if (!done) { done = true; clearTimeout(t); resolve(res); }
      }, function () { clearTimeout(t); fallback(); });
    }));
    return;
  }
  // Libraries, fonts and icons: from the phone first, refreshed in the background. Music streams as usual.
  if ((same && !/\/music\//.test(url)) || LIBS.test(url)) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(r).then(function (hit) {
        var net = fetch(r).then(function (res) { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }, function () { return hit || Response.error(); });
        return hit || net;
      });
    }));
  }
});
