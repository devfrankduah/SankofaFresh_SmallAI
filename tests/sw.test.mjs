// Tests for web/sw.js, run in a vm sandbox with a fake Cache API. Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

import { CACHE_PREFIX as APP_CACHE_PREFIX } from '../web/app.js';

const WEB = new URL('../web/', import.meta.url);
const SOURCE = readFileSync(new URL('sw.js', WEB), 'utf8');
const SW_URL = 'https://farm.test/app/sw.js';
const at = path => new URL(path, SW_URL).href;

// Everything the app can ask for: every file under web/ except the worker itself, dotfiles and
// unreviewed drafts (*.draft.json), which must never ship or be cached.
const DRAFT = /\.draft\.json$/;

function webFiles(directory = WEB, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || DRAFT.test(entry.name)) return [];
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return webFiles(new URL(`${entry.name}/`, directory), `${path}/`);
    return path === 'sw.js' ? [] : [path];
  }).sort();
}

function contentVersion(paths) {
  const hash = createHash('sha256');
  for (const path of paths) {
    hash.update(path).update('\0').update(readFileSync(new URL(path, WEB))).update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

function fakeCaches(initial = {}) {
  const stores = new Map(Object.entries(initial).map(([name, entries]) => [name, new Map(Object.entries(entries))]));
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(requests) {
          for (const request of requests) store.set(request.url, { cache: request.cache });
        },
        async match(href) {
          const entry = store.get(href);
          return entry && entry.body !== undefined ? new Response(entry.body, { headers: entry.headers }) : undefined;
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
  };
}

// Loads sw.js the way a browser would, with no fetch available, so any network use fails loudly.
function loadWorker(caches = fakeCaches()) {
  const listeners = {};
  const calls = { skipWaiting: 0, claim: 0 };
  const self = {
    location: { href: SW_URL },
    addEventListener: (type, listener) => {
      listeners[type] = listener;
    },
    skipWaiting: async () => {
      calls.skipWaiting += 1;
    },
    clients: {
      claim: async () => {
        calls.claim += 1;
      },
    },
  };
  const sandbox = { self, caches, URL, Request, Response, Headers, console };
  const exported = vm.runInNewContext(`${SOURCE}\n;({ CACHE_PREFIX, CACHE_VERSION, CACHE_NAME, PRECACHE, rangeResponse })`, sandbox);
  return { ...exported, listeners, calls, caches };
}

function fetchEvent(url, { mode = 'cors', method = 'GET', headers = {} } = {}) {
  const event = {
    request: { url, mode, method, headers: new Headers(headers) },
    response: null,
    respondWith(promise) {
      this.response = promise;
    },
  };
  return event;
}

const worker = loadWorker();

test('PRECACHE lists exactly the files in web/, and CACHE_VERSION is the hash of their contents', () => {
  const files = webFiles();
  const expected = `const CACHE_VERSION = '${contentVersion(files)}';\nconst PRECACHE = [\n${files.map(f => `  '${f}',`).join('\n')}\n];`;
  assert.deepEqual([...worker.PRECACHE], files, `web/ changed: put this in web/sw.js\n${expected}`);
  assert.equal(new Set(worker.PRECACHE).size, worker.PRECACHE.length);
  assert.equal(worker.CACHE_VERSION, contentVersion(files), `web/ contents changed: put this in web/sw.js\n${expected}`);
});

test('no draft is pre-cached, and the worker answers a draft with a 404', async () => {
  const drafts = readdirSync(WEB).filter(name => DRAFT.test(name));
  assert.ok(drafts.length > 0, 'expected the Twi draft in web/ so this test means something');
  assert.ok(worker.PRECACHE.every(path => !DRAFT.test(path)));
  const { listeners } = loadWorker(fakeCaches({ [worker.CACHE_NAME]: {} }));
  for (const draft of drafts) {
    const event = fetchEvent(at(draft));
    listeners.fetch(event);
    assert.equal((await event.response).status, 404, draft);
  }
});

test('the app and the worker use the same cache prefix', () => {
  assert.equal(APP_CACHE_PREFIX, worker.CACHE_PREFIX);
  assert.equal(worker.CACHE_NAME, `${worker.CACHE_PREFIX}${worker.CACHE_VERSION}`);
});

test('the shell, every script it loads and the manifest icons are pre-cached', () => {
  const html = readFileSync(new URL('index.html', WEB), 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', WEB), 'utf8'));
  const app = readFileSync(new URL('app.js', WEB), 'utf8');
  const referenced = [
    'index.html', 'contract.json', 'weather.json',
    ...[...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map(match => match[1]),
    ...manifest.icons.map(icon => icon.src),
    ...[...app.matchAll(/from '\.\/([^']+)'/g)].map(match => match[1]),
  ];
  for (const path of referenced) assert.ok(worker.PRECACHE.includes(path), path);
});

test('install caches every file fresh from the network, then activates at once', async () => {
  const { listeners, calls, caches, CACHE_NAME, PRECACHE } = loadWorker();
  let pending;
  listeners.install({ waitUntil: promise => { pending = promise; } });
  await pending;
  const stored = caches.stores.get(CACHE_NAME);
  assert.deepEqual([...stored.keys()].sort(), [...PRECACHE].map(at).sort());
  assert.ok([...stored.values()].every(entry => entry.cache === 'reload'));
  assert.equal(calls.skipWaiting, 1);
});

test('activate removes older app caches only, then takes control of open pages', async () => {
  const caches = fakeCaches({ 'sankofafresh-old': {}, 'someone-else': {}, [worker.CACHE_NAME]: {} });
  const { listeners, calls } = loadWorker(caches);
  let pending;
  listeners.activate({ waitUntil: promise => { pending = promise; } });
  await pending;
  assert.deepEqual([...caches.stores.keys()].sort(), ['someone-else', worker.CACHE_NAME].sort());
  assert.equal(calls.claim, 1);
});

test('app files come from the cache, navigations get the shell, and nothing goes to the network', async () => {
  assert.ok(!worker.PRECACHE.includes('not-shipped.json') && !worker.PRECACHE.includes('audio/en/band_red.mp3'));
  const caches = fakeCaches({
    [worker.CACHE_NAME]: {
      [at('index.html')]: { body: '<!doctype html>shell' },
      [at('contract.json')]: { body: '{"ok":true}' },
    },
  });
  const { listeners } = loadWorker(caches);
  const cases = [
    [fetchEvent(at('contract.json')), 200, '{"ok":true}'],
    [fetchEvent(at('contract.json?v=2#x')), 200, '{"ok":true}'],
    [fetchEvent(at('index.html?fixtures#/batches'), { mode: 'navigate' }), 200, '<!doctype html>shell'],
    [fetchEvent(at('./'), { mode: 'navigate' }), 200, '<!doctype html>shell'],
    [fetchEvent(at('not-shipped.json')), 404, ''],
    [fetchEvent(at('audio/en/band_red.mp3')), 404, ''],
  ];
  for (const [event, status, body] of cases) {
    listeners.fetch(event);
    assert.ok(event.response, event.request.url);
    const response = await event.response;
    assert.equal(response.status, status, event.request.url);
    assert.equal(await response.text(), body, event.request.url);
  }
});

test('a pre-cached file missing from the cache is reported, not fetched', async () => {
  const { listeners } = loadWorker(fakeCaches({ [worker.CACHE_NAME]: {} }));
  const event = fetchEvent(at(worker.PRECACHE[0]));
  listeners.fetch(event);
  assert.equal((await event.response).status, 503);
});

test('requests outside web/ and non-GET requests are left to the browser', () => {
  const { listeners } = loadWorker();
  for (const event of [
    fetchEvent('https://farm.test/tests/fixtures/sample_tree.json'),
    fetchEvent('https://elsewhere.test/app/contract.json'),
    fetchEvent(at('contract.json'), { method: 'POST' }),
  ]) {
    listeners.fetch(event);
    assert.equal(event.response, null, event.request.url);
  }
});

test('byte ranges are served from the cached file, as Safari needs for audio', async () => {
  const file = () => new Response('0123456789', { headers: { 'Content-Type': 'audio/mpeg' } });
  const expectations = [
    ['bytes=0-3', 206, '0123', 'bytes 0-3/10'],
    ['bytes=6-', 206, '6789', 'bytes 6-9/10'],
    ['bytes=-3', 206, '789', 'bytes 7-9/10'],
    ['bytes=-30', 206, '0123456789', 'bytes 0-9/10'],
    ['bytes=8-50', 206, '89', 'bytes 8-9/10'],
    ['bytes=10-', 416, '', 'bytes */10'],
    ['bytes=-0', 416, '', 'bytes */10'],
    ['bytes=5-2', 200, '0123456789', null],
    ['bytes=0-1,4-5', 200, '0123456789', null],
    ['items=0-1', 200, '0123456789', null],
    ['bytes=-', 200, '0123456789', null],
  ];
  for (const [range, status, body, contentRange] of expectations) {
    const response = await worker.rangeResponse(range, file());
    assert.equal(response.status, status, range);
    assert.equal(await response.text(), body, range);
    assert.equal(response.headers.get('Content-Range'), contentRange, range);
    if (status === 206) assert.equal(response.headers.get('Content-Type'), 'audio/mpeg', range);
  }
});

test('the worker never calls the network itself', () => {
  assert.ok(!/\bfetch\(/.test(SOURCE));
  assert.ok(!/importScripts|XMLHttpRequest|sendBeacon/.test(SOURCE));
});

test('the manifest is installable and points inside the app', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', WEB), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  const sizes = manifest.icons.map(icon => `${icon.sizes} ${icon.purpose}`);
  assert.ok(sizes.includes('192x192 any') && sizes.includes('512x512 any') && sizes.includes('512x512 maskable'), sizes.join(', '));
  for (const icon of manifest.icons) {
    const png = readFileSync(new URL(icon.src, WEB));
    assert.equal(png.subarray(1, 4).toString(), 'PNG', icon.src);
    const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    assert.equal(`${width}x${height}`, icon.sizes, icon.src);
  }
});
