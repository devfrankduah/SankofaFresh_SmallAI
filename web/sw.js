// Offline service worker (spec 1 and 4, AC06 and AC07). Every file in web/ is cached on install under
// a versioned cache name, and the app is then served only from that cache: no network requests after
// install. tests/sw.test.mjs fails when PRECACHE no longer lists exactly the files in web/, or when
// CACHE_VERSION is not the hash of their contents, and prints the values to paste here. Bumping the
// version is what makes installed phones fetch a new tree, message file or script.

const CACHE_PREFIX = 'sankofafresh-';
const CACHE_VERSION = '4e783920c24bbf3b';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const PRECACHE = [
  'app.js',
  'canonical.js',
  'contract.json',
  'features.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'index.html',
  'manifest.webmanifest',
  'messages.en.json',
  'messages.tw.draft.json',
  'metrics.json',
  'storage.js',
  'styles.css',
  'tree.js',
  'tree.json',
  'weather.json',
];
const PRECACHED = new Set(PRECACHE.map(path => new URL(path, self.location.href).href));
const APP_SHELL = new URL('index.html', self.location.href).href;
const SCOPE = new URL('./', self.location.href).href;

self.addEventListener('install', event => {
  // cache: 'reload' skips the HTTP cache so a new version never stores an older copy of a file.
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(PRECACHE.map(path => new Request(new URL(path, self.location.href), { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(names => Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  // Outside web/ (the shared test fixtures when the repository root is served) the browser fetches
  // as usual; the deployed app has nothing there.
  if (!url.href.startsWith(SCOPE)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fromCache(APP_SHELL, request));
    return;
  }
  event.respondWith(fromCache(url.href, request));
});

// A file that is not in this version's cache does not exist in this version, so it gets a 404 rather
// than a network request (the app treats a 404 on optional files such as metrics.json as "not there").
async function fromCache(href, request) {
  if (!PRECACHED.has(href)) return new Response('', { status: 404, statusText: 'Not in this app version' });
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(href);
  if (!cached) return new Response('', { status: 503, statusText: 'App cache incomplete' });
  return request.headers.has('range') ? rangeResponse(request.headers.get('range'), cached) : cached;
}

// Safari asks for audio in byte ranges and will not play a cached full response to a range request.
// As HTTP allows, a range the worker can't parse (or several ranges) gets the whole file instead.
async function rangeResponse(rangeHeader, response) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (match[1] === '' && match[2] === '')) return response;
  if (match[1] !== '' && match[2] !== '' && Number(match[2]) < Number(match[1])) return response;
  const body = await response.arrayBuffer();
  const size = body.byteLength;
  let start;
  let end;
  if (match[1] === '') {
    // A suffix range: the last N bytes. "bytes=-0" starts at size, so it is unsatisfiable below.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}
