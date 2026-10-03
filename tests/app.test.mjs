// Unit tests for the pure parts of web/app.js. Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  batchesFromFixtures,
  fetchJson,
  fillPlaceholders,
  firstUnanswered,
  freeBatchLabels,
  hasEveryMessage,
  isCalendarDate,
  isValidAnswer,
  keepValidAnswers,
  languageCandidates,
  loadLanguages,
  localDateString,
  parseRoute,
  pickAction,
  requireContract,
  routeHash,
} from '../web/app.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));
const CONTRACT = json('web/contract.json');
const MESSAGES = json('web/messages.en.json');
const DEMO = json('tests/fixtures/demo_batches.json');
const OUT_OF_RANGE = json('tests/fixtures/out_of_range.json');
const INPUTS = Object.fromEntries(CONTRACT.inputs.map(input => [input.name, input]));
const DONT_KNOW = CONTRACT.dont_know_value;

test('the shipped contract has everything the screens read', () => {
  assert.deepEqual(requireContract(CONTRACT), []);
});

test('a contract without a batch_label choice or an action rule is refused', () => {
  const broken = structuredClone(CONTRACT);
  broken.inputs = broken.inputs.filter(input => input.name !== 'batch_label');
  delete broken.actions;
  const problems = requireContract(broken);
  assert.ok(problems.some(problem => problem.includes('batch_label')));
  assert.ok(problems.some(problem => problem.includes('actions')));
  assert.deepEqual(requireContract(null), ['contract is not an object']);
});

test('language candidates come from contract.languages, else the bootstrap language', () => {
  assert.deepEqual(languageCandidates({}, 'en'), ['en']);
  assert.deepEqual(languageCandidates({ languages: ['lg', 'en', 'lg'] }, 'en'), ['lg', 'en']);
  assert.deepEqual(languageCandidates({ languages: ['../secret', 'EN', '', 7, 'sw'] }, 'en'), ['sw']);
});

test('a messages file counts only when it has every contract key with text', () => {
  assert.equal(hasEveryMessage(CONTRACT, MESSAGES), true);
  const missing = { ...MESSAGES };
  delete missing.reason_floor;
  assert.equal(hasEveryMessage(CONTRACT, missing), false);
  assert.equal(hasEveryMessage(CONTRACT, { ...MESSAGES, band_red: '  ' }), false);
  assert.equal(hasEveryMessage(CONTRACT, [MESSAGES]), false);
  assert.equal(hasEveryMessage(CONTRACT, null), false);
});

test('only languages whose file loads complete are offered, in contract order', async () => {
  const files = {
    'messages.en.json': MESSAGES,
    'messages.xx.json': { band_green: 'partial' },
  };
  const readJson = async url => {
    if (!Object.hasOwn(files, url)) throw new Error(`${url}: HTTP 404`);
    return files[url];
  };
  const loaded = await loadLanguages(CONTRACT, ['xx', 'zz', 'en'], readJson);
  assert.deepEqual(loaded.map(language => language.code), ['en']);
});

test('fetchJson rejects a failed response instead of parsing it', async () => {
  const notFound = async () => ({ ok: false, status: 404, json: async () => ({}) });
  await assert.rejects(fetchJson('messages.xx.json', notFound), /HTTP 404/);
  const found = async () => ({ ok: true, status: 200, json: async () => ({ a: 1 }) });
  assert.deepEqual(await fetchJson('x.json', found), { a: 1 });
});

test('placeholders are filled by name and unknown ones are left alone', () => {
  const sms = fillPlaceholders(MESSAGES.sms_template, { batch_label: 'Batch 2' });
  assert.ok(sms.includes('(Batch 2)'));
  assert.ok(!sms.includes('{'));
  assert.equal(fillPlaceholders('{year} {other}', { year: 2025 }), '2025 {other}');
});

test('calendar dates follow the contract format and reject impossible days', () => {
  for (const [value, valid] of [
    ['2025-07-01', true], ['2024-02-29', true], ['0025-01-01', true],
    ['2025-02-29', false], ['2025-7-1', false], ['2025-13-01', false], ['0000-01-01', false],
    ['dont_know', false], [20250701, false], [null, false], ['2025-07-01T00:00', false],
  ]) {
    assert.equal(isCalendarDate(value), valid, String(value));
  }
});

test('answers are checked against each contract input', () => {
  const stored = INPUTS.days_stored;
  for (const [value, valid] of [[0, true], [180, true], [181, false], [-1, false], [true, false], [12.5, false], ['12', false]]) {
    assert.equal(isValidAnswer(stored, value, DONT_KNOW), valid, String(value));
  }
  assert.equal(isValidAnswer(stored, DONT_KNOW, DONT_KNOW), true);
  assert.equal(isValidAnswer(INPUTS.batch_label, DONT_KNOW, DONT_KNOW), false, 'batch_label has no "Don\'t know"');
  assert.equal(isValidAnswer(INPUTS.rewetted, 'yes', DONT_KNOW), true);
  assert.equal(isValidAnswer(INPUTS.rewetted, 'maybe', DONT_KNOW), false);
  assert.equal(isValidAnswer({ name: 'x', type: 'colour' }, 'red', DONT_KNOW), false);
});

test('every question that the contract allows it on offers "Don\'t know"', () => {
  for (const input of CONTRACT.inputs) {
    assert.equal(isValidAnswer(input, DONT_KNOW, DONT_KNOW), input.name !== 'batch_label', input.name);
  }
});

test('the form is complete only when every input has an allowed answer', () => {
  for (const fixtureCase of DEMO.cases) {
    assert.equal(firstUnanswered(CONTRACT, fixtureCase.inputs), null, fixtureCase.id);
  }
  const partial = { ...DEMO.cases[0].inputs };
  delete partial.musty_smell;
  assert.equal(firstUnanswered(CONTRACT, partial), 'musty_smell');
  assert.equal(firstUnanswered(CONTRACT, OUT_OF_RANGE.cases[0].inputs), 'days_stored');
  assert.equal(firstUnanswered(CONTRACT, {}), CONTRACT.inputs[0].name);
});

test('stale or corrupted stored answers are dropped before prefilling the form', () => {
  const kept = keepValidAnswers(CONTRACT, { ...OUT_OF_RANGE.cases[0].inputs, rewetted: 'perhaps', extra: 1 });
  assert.equal(Object.hasOwn(kept, 'days_stored'), false);
  assert.equal(Object.hasOwn(kept, 'rewetted'), false);
  assert.equal(Object.hasOwn(kept, 'extra'), false);
  assert.equal(kept.days_drying, 11);
  assert.deepEqual(keepValidAnswers(CONTRACT, null), {});
});

test('new batches can only take labels that are not in use', () => {
  const labels = INPUTS.batch_label.values;
  assert.deepEqual(freeBatchLabels(CONTRACT, []), labels);
  assert.deepEqual(freeBatchLabels(CONTRACT, ['Batch 1', 'Batch 3']), labels.filter(l => l !== 'Batch 1' && l !== 'Batch 3'));
  assert.deepEqual(freeBatchLabels(CONTRACT, labels), []);
});

test('the action follows the contract rule (spec 5.6)', () => {
  // Read from the contract so a rename of the drying reason can't break this table.
  const dryingReason = CONTRACT.features.find(feature => feature.name === 'days_drying').reason;
  for (const [band, reasons, action] of [
    ['red', ['reason_rewetted', 'reason_floor'], 'action_redry'],
    ['amber', ['reason_damp_check'], 'action_redry'],
    ['amber', [dryingReason], 'action_redry'],
    ['red', ['reason_floor', 'reason_rewetted'], 'action_raise_bags'],
    ['amber', ['reason_humid_weeks', 'reason_rewetted'], 'action_test_sample'],
    ['red', ['reason_musty'], 'action_test_sample'],
    ['red', [], 'action_test_sample'],
    ['not_sure', ['reason_missing_input'], 'action_test_sample'],
    ['not_sure', ['reason_low_confidence'], 'action_test_sample'],
    ['green', [], null],
  ]) {
    assert.equal(pickAction(CONTRACT, band, reasons), action, `${band} ${reasons.join(',')}`);
  }
  assert.equal(pickAction(CONTRACT, 'purple', []), null);
});

test('routes parse back from the hashes the app writes', () => {
  assert.deepEqual(parseRoute(''), { view: 'batches', param: null });
  assert.deepEqual(parseRoute('#/'), { view: 'batches', param: null });
  assert.deepEqual(parseRoute('#/settings'), { view: 'settings', param: null });
  assert.deepEqual(parseRoute('#/nowhere/x'), { view: 'batches', param: null });
  assert.deepEqual(parseRoute('#/check/%E0%A4%A'), { view: 'batches', param: null });
  for (const label of INPUTS.batch_label.values) {
    assert.deepEqual(parseRoute(routeHash('result', label)), { view: 'result', param: label });
    assert.deepEqual(parseRoute(routeHash('check', label)), { view: 'check', param: label });
  }
  assert.deepEqual(parseRoute(routeHash('check')), { view: 'check', param: null });
});

test('local dates are written YYYY-MM-DD in the phone time zone', () => {
  assert.equal(localDateString(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(localDateString(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});

test('fixture batches carry only the abstentions the fixtures state', () => {
  const batches = batchesFromFixtures(CONTRACT, [DEMO, OUT_OF_RANGE], '2026-10-03T12:00:00.000Z');
  const byLabel = Object.fromEntries(batches.map(batch => [batch.label, batch]));
  assert.deepEqual(Object.keys(byLabel), ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4']);
  assert.equal(byLabel['Batch 1'].result, null);
  assert.equal(byLabel['Batch 2'].result, null);
  assert.deepEqual(byLabel['Batch 3'].result, { band: 'not_sure', reasons: ['reason_missing_input'] });
  assert.deepEqual(byLabel['Batch 4'].result, { band: 'not_sure', reasons: ['reason_out_of_range'] });
  assert.deepEqual(batchesFromFixtures(CONTRACT, [{ cases: [{ inputs: { batch_label: 'Batch 99' } }] }], ''), []);
  assert.deepEqual(batchesFromFixtures(CONTRACT, [null, {}], ''), []);
});

test('every message key app.js names exists in the contract', () => {
  const source = read('web/app.js');
  const literalKeys = [...source.matchAll(/this\.t\('([a-z_]+)'/g)].map(match => match[1]);
  assert.ok(literalKeys.length > 5, 'expected app.js to name message keys');
  const keys = new Set(CONTRACT.message_keys);
  for (const key of literalKeys) assert.ok(keys.has(key), key);
  for (const input of CONTRACT.inputs) assert.ok(keys.has(`question_${input.name}`), input.name);
  for (const input of CONTRACT.inputs) {
    if (input.type !== 'choice' || input.name === 'batch_label') continue;
    for (const value of input.values) assert.ok(keys.has(`option_${value}`), value);
  }
  for (const band of CONTRACT.bands) assert.ok(keys.has(band.message), band.name);
});

test('every icon app.js asks for is drawn in index.html', () => {
  const html = read('web/index.html');
  const source = read('web/app.js');
  const drawn = new Set([...html.matchAll(/<symbol id="i-([a-z_-]+)"/g)].map(match => match[1]));
  const named = [...source.matchAll(/icon\('([a-z_-]+)'/g)].map(match => match[1]);
  for (const name of named) assert.ok(drawn.has(name), name);
  for (const band of CONTRACT.bands) assert.ok(drawn.has(`band-${band.name}`), band.name);
});
