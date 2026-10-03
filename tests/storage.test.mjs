// Unit tests for web/storage.js. Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  RecordStore,
  SCHEMA_VERSION,
  STORAGE_KEY,
  browserStorage,
  emptyRecords,
  memoryStorage,
  sanitizeRecords,
} from '../web/storage.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const CONTRACT = JSON.parse(read('web/contract.json'));
const DEMO = JSON.parse(read('tests/fixtures/demo_batches.json'));
const REASON = CONTRACT.abstention.rules[0].reason;
const ACTION = CONTRACT.recorded_actions[0];

function batch(overrides = {}) {
  return {
    label: 'Batch 1',
    answers: { ...DEMO.cases[0].inputs },
    checkedAt: '2026-10-03T12:00:00.000Z',
    result: { band: 'not_sure', reasons: [REASON] },
    actions: [{ action: ACTION, at: '2026-10-04T08:00:00.000Z' }],
    ...overrides,
  };
}

function stored(batches, extra = {}) {
  return { schema: SCHEMA_VERSION, consent: true, language: 'en', batches, ...extra };
}

// Fails the way browsers do: Safari private mode on setItem, blocked storage on every call.
function throwingStorage({ get = false, set = false, remove = false } = {}) {
  const inner = memoryStorage();
  const fail = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  return {
    getItem: key => (get ? fail() : inner.getItem(key)),
    setItem: (key, value) => (set ? fail() : inner.setItem(key, value)),
    removeItem: key => (remove ? fail() : inner.removeItem(key)),
  };
}

test('a fresh phone reads as no consent, no language and no batches', () => {
  const store = new RecordStore(memoryStorage());
  assert.equal(store.available, true);
  assert.deepEqual(store.read(CONTRACT), emptyRecords());
});

test('records survive a write and a fresh read', () => {
  const storage = memoryStorage();
  const records = { consent: true, language: 'en', batches: [batch(), batch({ label: 'Batch 2', result: null, actions: [] })] };
  assert.equal(new RecordStore(storage).write(records), true);
  assert.deepEqual(new RecordStore(storage).read(CONTRACT), records);
  const raw = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.deepEqual(Object.keys(raw).sort(), ['batches', 'consent', 'language', 'schema']);
});

test('only the named record fields are written, nothing extra', () => {
  const storage = memoryStorage();
  new RecordStore(storage).write({ consent: true, language: null, batches: [], phone: '000', location: [0, 0] });
  const raw = storage.getItem(STORAGE_KEY);
  assert.ok(!raw.includes('phone') && !raw.includes('location'), raw);
});

test('delete-all leaves nothing under the records key', () => {
  const storage = memoryStorage();
  const store = new RecordStore(storage);
  store.write({ consent: true, language: 'en', batches: [batch()] });
  assert.equal(store.clear(), true);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(store.read(CONTRACT), emptyRecords());
});

test('storage that refuses writes is reported unavailable and every call still returns', () => {
  const store = new RecordStore(throwingStorage({ set: true }));
  assert.equal(store.available, false);
  assert.deepEqual(store.read(CONTRACT), emptyRecords());
  assert.equal(store.write({ consent: true, language: null, batches: [] }), false);
  assert.equal(store.clear(), false);
  assert.equal(new RecordStore(null).available, false);
});

test('a read or delete that throws is caught', () => {
  const unreadable = new RecordStore(throwingStorage({ get: true }));
  assert.equal(unreadable.available, true);
  assert.deepEqual(unreadable.read(CONTRACT), emptyRecords());
  const undeletable = new RecordStore(throwingStorage({ remove: false }));
  undeletable.write({ consent: true, language: null, batches: [] });
  undeletable.storage.removeItem = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  assert.equal(undeletable.clear(), false);
});

test('delete-all reports failure when the records are still there afterwards', () => {
  const store = new RecordStore(memoryStorage());
  store.write({ consent: true, language: null, batches: [batch()] });
  store.storage.removeItem = () => {};
  assert.equal(store.clear(), false);
});

test('corrupted or foreign data reads as empty instead of crashing', () => {
  for (const text of ['{not json', 'null', '[]', '"text"', JSON.stringify({ schema: 99, consent: true, batches: [batch()] })]) {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, text);
    assert.deepEqual(new RecordStore(storage).read(CONTRACT), emptyRecords(), text);
  }
});

test('stored batches the contract does not allow are dropped one by one', () => {
  const records = sanitizeRecords(CONTRACT, stored([
    batch(),
    batch({ label: 'Batch 1' }),
    batch({ label: 'Batch 99' }),
    batch({ label: 'Batch 3', checkedAt: 'yesterday' }),
    batch({ label: 'Batch 4', answers: null }),
    batch({ label: 'Batch 5', result: { band: 'purple', reasons: [] } }),
    batch({ label: 'Batch 6', result: { band: 'red', reasons: ['reason_invented'] } }),
    batch({ label: 'Batch 7', result: { band: 'red', reasons: [CONTRACT.message_keys.find(k => k.startsWith('action_'))] } }),
    batch({ label: 'Batch 8', result: 'red' }),
    batch({ label: 'Batch 9', result: null, actions: [{ action: 'burned', at: '2026-10-04' }, { action: ACTION, at: 'soon' }, 'x'] }),
    'not a batch',
  ]));
  assert.deepEqual(records.batches.map(b => b.label), ['Batch 1', 'Batch 9']);
  assert.deepEqual(records.batches[1].actions, []);
  assert.equal(records.consent, true);
  assert.equal(records.language, 'en');
});

test('consent counts only when stored as true', () => {
  assert.equal(sanitizeRecords(CONTRACT, stored([], { consent: 'yes' })).consent, false);
  assert.equal(sanitizeRecords(CONTRACT, stored([], { language: 7 })).language, null);
});

test('a missing or throwing localStorage gives no storage, not an exception', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  if (descriptor && !descriptor.configurable) return;
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    assert.equal(browserStorage(), null);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined });
    assert.equal(browserStorage(), null);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('the records module has no way to reach the network', () => {
  const source = read('web/storage.js');
  for (const api of ['fetch', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'import(']) {
    assert.ok(!source.includes(api), api);
  }
});
