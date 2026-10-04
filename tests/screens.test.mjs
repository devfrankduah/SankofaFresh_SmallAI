// Renders result and About screens with a minimal stand-in for the DOM and checks the honesty labels
// by message key: synthetic_label on every band's result and on About this check, and sms_not_sent
// beside every SMS draft. Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { App, bandMessage, offersSms } from '../web/app.js';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const CONTRACT = read('web/contract.json');
const WEATHER = read('web/weather.json');
const LANGUAGES = CONTRACT.languages.map(code => ({ code, messages: read(`web/messages.${code}.json`) }));
const DEMO = read('web/demo_batches.json').batches[0].inputs;

// Just enough of an element for the screen builders: attributes, children, text and listeners.
class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.className = '';
    this.ownText = '';
    this.value = '';
    this.dataset = {};
    this.classList = { add() {}, remove() {}, contains: () => false };
  }

  append(...nodes) {
    for (const node of nodes) this.children.push(typeof node === 'string' ? Object.assign(new FakeElement('#text'), { ownText: node }) : node);
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener() {}
  focus() {}

  set textContent(value) {
    this.children = [];
    this.ownText = String(value);
  }

  get textContent() {
    return this.ownText + this.children.map(child => child.textContent).join('');
  }

  get classes() {
    return `${this.className} ${this.attributes.class ?? ''}`.trim().split(/\s+/);
  }

  *walk() {
    yield this;
    for (const child of this.children) yield* child.walk();
  }
}

function withFakeDom(run) {
  const saved = { document: globalThis.document, window: globalThis.window, location: globalThis.location };
  globalThis.document = {
    documentElement: new FakeElement('html'),
    createElement: tag => new FakeElement(tag),
    createElementNS: (namespace, tag) => new FakeElement(tag),
    getElementById: id => Object.assign(new FakeElement('div'), { id }),
  };
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  globalThis.location = { href: 'https://farm.test/app/index.html', hash: '' };
  try {
    return run();
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  }
}

function appIn(language, batches) {
  const store = { available: true, read: () => ({ consent: true, language, batches }), write: () => true };
  const model = { tree: { model_version: 'tree-test', sha256: '0'.repeat(64) }, weather: WEATHER, weatherYear: 2025, demo: false };
  return new App({ contract: CONTRACT, languages: LANGUAGES, store, model, metrics: null, audioIndex: null, demoAnswers: [] });
}

const BANDS = [...CONTRACT.classes, CONTRACT.abstention.band];
// A first reason that leads to each band, so every band's screen is built the way a check builds it.
const REASONS = { green: [], amber: ['reason_damp_check'], red: ['reason_damp_check', 'reason_musty'], [CONTRACT.abstention.band]: ['reason_missing_input'] };

function batchFor(band) {
  return { label: `Batch ${BANDS.indexOf(band) + 1}`, answers: { ...DEMO }, checkedAt: '2026-10-03T09:00:00.000Z', result: { band, reasons: REASONS[band], weatherYear: 2025 }, actions: [], demoData: false };
}

const textOf = nodes => nodes.map(node => node.textContent).join(' ');

test('every band has a result screen to check', () => {
  for (const band of BANDS) assert.ok(bandMessage(CONTRACT, band), band);
  assert.ok(BANDS.some(band => offersSms(CONTRACT, band)), 'at least one band offers an SMS');
});

for (const { code, messages } of LANGUAGES) {
  test(`${code}: every result and About this check show synthetic_label`, () => withFakeDom(() => {
    const batches = BANDS.map(batchFor);
    const app = appIn(code, batches);
    for (const batch of batches) {
      const screen = app.resultScreen(batch.label);
      assert.ok(!screen.redirect, `${batch.result.band} rendered`);
      assert.ok(textOf(screen.body.filter(Boolean)).includes(messages.synthetic_label), `${batch.result.band}: synthetic_label shown`);
    }
    for (const label of [null, batches[0].label]) {
      const screen = app.evidenceScreen(label);
      assert.ok(textOf(screen.body.filter(Boolean)).includes(messages.synthetic_label), `About this check (${label ?? 'from Settings'})`);
    }
  }));

  test(`${code}: sms_not_sent labels every SMS draft, and only bands that offer one have a draft`, () => withFakeDom(() => {
    const batches = BANDS.map(batchFor);
    const app = appIn(code, batches);
    for (const batch of batches) {
      const nodes = app.resultScreen(batch.label).body.filter(Boolean).flatMap(node => [...node.walk()]);
      const drafts = nodes.filter(node => node.tagName === 'TEXTAREA');
      assert.equal(drafts.length, offersSms(CONTRACT, batch.result.band) ? 1 : 0, `${batch.result.band}: drafts`);
      for (const section of nodes.filter(node => node.classes.includes('sms'))) {
        const label = [...section.walk()].find(node => node.classes.includes('sms-label'));
        assert.ok(label, `${batch.result.band}: the draft has its label`);
        assert.equal(label.textContent, messages.sms_not_sent, `${batch.result.band}: label text`);
        assert.ok([...section.walk()].some(node => node.tagName === 'TEXTAREA'), `${batch.result.band}: label sits beside the draft`);
      }
    }
  }));
}
