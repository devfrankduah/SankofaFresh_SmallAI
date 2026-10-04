// Unit tests for the pure parts of web/app.js. Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  answersFromFixtures,
  assessAnswers,
  audioKeys,
  fetchJson,
  fetchOptionalText,
  fillPlaceholders,
  firstUnanswered,
  freeBatchLabels,
  hasEveryMessage,
  isCalendarDate,
  isValidAnswer,
  keepValidAnswers,
  languageCandidates,
  loadLanguages,
  loadModel,
  loadOptionalJson,
  localDateString,
  formatFarmDate,
  numericDate,
  metricCell,
  offersSms,
  parseRoute,
  pickAction,
  reasonsFromPath,
  requireContract,
  routeHash,
} from '../web/app.js';
import { canonicalNodes } from '../web/canonical.js';
import { encode } from '../web/features.js';
import { verifyTree } from '../web/tree.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));
const CONTRACT = json('web/contract.json');
const MESSAGES = json('web/messages.en.json');
const DEMO = json('tests/fixtures/demo_batches.json');
const OUT_OF_RANGE = json('tests/fixtures/out_of_range.json');
const INPUTS = Object.fromEntries(CONTRACT.inputs.map(input => [input.name, input]));
const DONT_KNOW = CONTRACT.dont_know_value;
const WEATHER = json('web/weather.json');
const SAMPLE_TREE_TEXT = read('tests/fixtures/sample_tree.json');
const SUBTLE = webcrypto.subtle;
const reasonOf = name => CONTRACT.features.find(feature => feature.name === name).reason;
const ruleReason = id => CONTRACT.abstention.rules.find(rule => rule.id === id).reason;

// A fetch stand-in that serves the given files and answers 404 for anything else.
function fakeFetch(files) {
  return async url => {
    if (!Object.hasOwn(files, url)) return { ok: false, status: 404, text: async () => '', json: async () => ({}) };
    const text = typeof files[url] === 'string' ? files[url] : JSON.stringify(files[url]);
    return { ok: true, status: 200, text: async () => text, json: async () => JSON.parse(text) };
  };
}

// Sample-tree metadata with new nodes; the ranges are widened because they are not hashed and the
// sample's illustrative ranges exclude part of the real weather year.
async function verifiedTree(nodes, extra = {}) {
  const base = JSON.parse(SAMPLE_TREE_TEXT);
  const ranges = Object.fromEntries(Object.keys(base.feature_ranges).map(name => [name, [-1000, 1000]]));
  const tree = { ...base, feature_ranges: ranges, ...extra, nodes };
  tree.sha256 = createHash('sha256').update(canonicalNodes(nodes), 'utf8').digest('hex');
  return verifyTree(tree, SUBTLE);
}

const featureIndex = name => CONTRACT.features.findIndex(feature => feature.name === name);
const CLEAR_ANSWERS = { ...DEMO.cases[0].inputs };

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

test('an unreviewed draft is never offered, even when listed or renamed', async () => {
  // Built here, not read from web/: a draft is only there until it is reviewed. It has every key, so
  // only the _status marker can make the app refuse it.
  const draft = { ...MESSAGES, _status: 'UNREVIEWED DRAFT, machine-written, not for release' };
  assert.equal(hasEveryMessage(CONTRACT, draft), false);
  assert.equal(hasEveryMessage(CONTRACT, { ...MESSAGES, _status: 'draft' }), false);
  assert.deepEqual(languageCandidates({ languages: ['tw.draft', 'en'] }, 'en'), ['en'], 'no code can name a .draft.json file');
  const readJson = async url => {
    if (url === 'messages.tw.json') return draft;
    if (url === 'messages.en.json') return MESSAGES;
    throw new Error(`${url}: HTTP 404`);
  };
  const loaded = await loadLanguages(CONTRACT, ['tw', 'en'], readJson);
  assert.deepEqual(loaded.map(language => language.code), ['en'], 'a draft renamed without review is still refused');
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

test('every date is day, month, year: en-GH names the month, every other language is numeric', () => {
  assert.equal(numericDate(new Date(2026, 9, 3, 23, 59)), '03/10/2026');
  assert.equal(numericDate(new Date(2026, 0, 31)), '31/01/2026');
  assert.equal(formatFarmDate(new Date(2026, 9, 3, 23, 59), 'en'), '3 Oct 2026');
  assert.equal(formatFarmDate(new Date(2026, 0, 31), 'en'), '31 Jan 2026');
  assert.equal(formatFarmDate(new Date(2026, 9, 3), 'tw'), '03/10/2026');
  assert.equal(formatFarmDate(new Date(2026, 9, 3), 'xx'), '03/10/2026');
  assert.equal(formatFarmDate(new Date('not a date'), 'en'), '');
  assert.equal(formatFarmDate('2026-10-03', 'en'), '');
});

test('the app writes dates through the one shared formatter only', () => {
  const app = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
  assert.equal((app.match(/new Intl\.DateTimeFormat\(/g) ?? []).length, 1, 'one date formatter');
  assert.equal((app.match(/toLocaleDateString|toDateString|toLocaleString\(/g) ?? []).length, 0);
});

test('local dates are written YYYY-MM-DD in the phone time zone', () => {
  assert.equal(localDateString(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(localDateString(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});

test('fixture previews take only the answers, never the expected results', () => {
  const found = answersFromFixtures(CONTRACT, [DEMO, OUT_OF_RANGE]);
  assert.deepEqual(found.map(entry => entry.label), ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4']);
  assert.deepEqual(found[0].answers, DEMO.cases[0].inputs);
  assert.ok(found.every(entry => !Object.hasOwn(entry, 'result')));
  assert.deepEqual(answersFromFixtures(CONTRACT, [{ cases: [{ inputs: { batch_label: 'Batch 99' } }] }]), []);
  assert.deepEqual(answersFromFixtures(CONTRACT, [null, {}]), []);
});

test('reasons are risk-side splits on the path, in path order, at most two, without repeats', () => {
  const step = (name, left) => ({ name, left });
  assert.deepEqual(reasonsFromPath(CONTRACT, [step('rh14_mean', false), step('days_drying', true), step('rewetted', false)]),
    [reasonOf('rh14_mean'), reasonOf('days_drying')]);
  assert.deepEqual(reasonsFromPath(CONTRACT, [step('rh14_mean', false), step('rh14_max', false), step('musty', false)]),
    [reasonOf('rh14_mean'), reasonOf('musty')], 'the two humidity features share one reason');
  assert.deepEqual(reasonsFromPath(CONTRACT, [step('rh14_mean', true), step('days_drying', false), step('t14_mean', false)]), [],
    'the safe side of a split, and a feature with no reason, give nothing');
  assert.deepEqual(reasonsFromPath(CONTRACT, [step('floor', false)], 1), [reasonOf('floor')]);
});

test('every feature with a reason says which side of a split is the risk', () => {
  for (const feature of CONTRACT.features) {
    if (feature.reason) assert.ok(['higher', 'lower'].includes(feature.risk), feature.name);
  }
});

test('"Don\'t know" and out-of-range answers abstain without needing a model', () => {
  const unknown = { ...CLEAR_ANSWERS, musty_smell: DONT_KNOW };
  assert.deepEqual(assessAnswers(CONTRACT, unknown, { tree: null, weather: null }),
    { band: CONTRACT.abstention.band, reasons: [ruleReason('dont_know')], predicted: false });
  assert.deepEqual(assessAnswers(CONTRACT, OUT_OF_RANGE.cases[0].inputs, { tree: null, weather: null }),
    { band: CONTRACT.abstention.band, reasons: [ruleReason('out_of_range')], predicted: false });
  assert.throws(() => assessAnswers(CONTRACT, CLEAR_ANSWERS, { tree: null, weather: WEATHER }), /no verified tree/);
  assert.throws(() => assessAnswers(CONTRACT, CLEAR_ANSWERS, { tree: null, weather: null }));
});

test('a check runs encode, the tree and rule 3, and the band matches the sample tree split', async () => {
  const tree = await verifyTree(JSON.parse(SAMPLE_TREE_TEXT), SUBTLE);
  for (const day of ['2025-01-10', '2025-03-01', '2025-06-20', '2025-08-15', '2025-11-30']) {
    const answers = { ...CLEAR_ANSWERS, storage_start: day, days_stored: 10 };
    const encoded = encode(CONTRACT, answers, WEATHER, tree);
    const outcome = assessAnswers(CONTRACT, answers, { tree, weather: WEATHER });
    if (encoded.abstainReason) {
      assert.deepEqual(outcome.reasons, [encoded.abstainReason], day);
      continue;
    }
    const humid = Math.fround(encoded.features[featureIndex('rh14_mean')]) > 80.5;
    // The right leaf's 0.6 equals the cut, so it keeps red; red's reason is the humidity split.
    assert.deepEqual(outcome, humid
      ? { band: 'red', reasons: [reasonOf('rh14_mean')], predicted: true }
      : { band: 'green', reasons: [], predicted: true }, day);
  }
});

test('low confidence abstains with its own reason, and green never shows reasons', async () => {
  const rewetted = featureIndex('rewetted');
  const nodes = [
    { id: 0, feature: rewetted, threshold: 0.5, left: 1, right: 2 },
    { id: 1, value: [0.5, 0.3, 0.2] },
    { id: 2, value: [0.9, 0.05, 0.05] },
  ];
  const tree = await verifiedTree(nodes);
  const unsure = assessAnswers(CONTRACT, { ...CLEAR_ANSWERS, rewetted: 'no' }, { tree, weather: WEATHER });
  assert.deepEqual(unsure, { band: CONTRACT.abstention.band, reasons: [ruleReason('low_confidence')], predicted: true });
  const green = assessAnswers(CONTRACT, { ...CLEAR_ANSWERS, rewetted: 'yes' }, { tree, weather: WEATHER });
  assert.deepEqual(green, { band: 'green', reasons: [], predicted: true }, 'rewetted went right, but green shows no reasons');
});

test('an amber result names the risk it went through and picks the matching action', async () => {
  const rewetted = featureIndex('rewetted');
  const floor = featureIndex('floor');
  const nodes = [
    { id: 0, feature: rewetted, threshold: 0.5, left: 1, right: 2 },
    { id: 1, value: [0.9, 0.05, 0.05] },
    { id: 2, feature: floor, threshold: 0.5, left: 3, right: 4 },
    { id: 3, value: [0.1, 0.8, 0.1] },
    { id: 4, value: [0.0, 0.1, 0.9] },
  ];
  const tree = await verifiedTree(nodes);
  const amber = assessAnswers(CONTRACT, { ...CLEAR_ANSWERS, rewetted: 'yes', storage_surface: 'raised' }, { tree, weather: WEATHER });
  assert.deepEqual(amber.reasons, [reasonOf('rewetted')]);
  assert.equal(pickAction(CONTRACT, amber.band, amber.reasons), CONTRACT.actions.reason_action[reasonOf('rewetted')]);
  const red = assessAnswers(CONTRACT, { ...CLEAR_ANSWERS, rewetted: 'yes', storage_surface: 'floor' }, { tree, weather: WEATHER });
  assert.deepEqual([red.band, red.reasons], ['red', [reasonOf('rewetted'), reasonOf('floor')]]);
});

test('the model loads tree.json when present and the sample tree only when it is missing', async () => {
  const options = files => ({ fetchImplementation: fakeFetch(files), subtle: SUBTLE });
  const trained = await loadModel(CONTRACT, options({ 'weather.json': WEATHER, 'tree.json': SAMPLE_TREE_TEXT }));
  assert.equal(trained.demo, false);
  assert.equal(trained.error, null);
  assert.equal(trained.weatherYear, WEATHER.year);
  assert.equal(trained.treeBytes, Buffer.byteLength(SAMPLE_TREE_TEXT));
  const demo = await loadModel(CONTRACT, options({ 'weather.json': WEATHER, '../tests/fixtures/sample_tree.json': SAMPLE_TREE_TEXT }));
  assert.equal(demo.demo, true);
  assert.ok(demo.tree);
});

test('a broken or tampered tree.json is refused, never replaced by the sample tree', async () => {
  const tampered = JSON.parse(SAMPLE_TREE_TEXT);
  tampered.nodes[2].value = [0.1, 0.2, 0.7];
  for (const treeText of ['{not json', JSON.stringify(tampered)]) {
    const model = await loadModel(CONTRACT, {
      fetchImplementation: fakeFetch({ 'weather.json': WEATHER, 'tree.json': treeText, '../tests/fixtures/sample_tree.json': SAMPLE_TREE_TEXT }),
      subtle: SUBTLE,
    });
    assert.equal(model.tree, null);
    assert.equal(model.demo, false);
    assert.equal(model.error, 'error_model_check');
  }
});

test('missing app files are reported, and Web Crypto is required', async () => {
  const noWeather = await loadModel(CONTRACT, { fetchImplementation: fakeFetch({ 'tree.json': SAMPLE_TREE_TEXT }), subtle: SUBTLE });
  assert.equal(noWeather.error, 'error_files');
  assert.ok(noWeather.tree, 'the tree still loads, so "Don\'t know" checks still work');
  const nothing = await loadModel(CONTRACT, { fetchImplementation: fakeFetch({ 'weather.json': WEATHER }), subtle: SUBTLE });
  assert.equal(nothing.tree, null);
  assert.equal(nothing.error, 'error_files');
  const insecure = await loadModel(CONTRACT, { fetchImplementation: fakeFetch({ 'weather.json': WEATHER, 'tree.json': SAMPLE_TREE_TEXT }), subtle: null });
  assert.equal(insecure.error, 'error_model_check');
});

test('optional files read as null when missing or unreadable', async () => {
  assert.equal(await fetchOptionalText('x.json', fakeFetch({})), null);
  await assert.rejects(fetchOptionalText('x.json', async () => ({ ok: false, status: 500, text: async () => '' })), /HTTP 500/);
  assert.equal(await loadOptionalJson('metrics.json', fakeFetch({ 'metrics.json': '{oops' })), null);
  assert.equal(await loadOptionalJson('metrics.json', async () => {
    throw new TypeError('offline');
  }), null);
  assert.deepEqual(await loadOptionalJson('metrics.json', fakeFetch({ 'metrics.json': { a: 1 } })), { a: 1 });
});

test('metrics show only real shares, and tree numbers only for the loaded tree', () => {
  const metrics = { tree_sha256: 'abc', tree: { accuracy: 0.9, coverage: null, macro_f1: 1.2 }, baseline: { accuracy: 0, red_recall: 'high' } };
  assert.equal(metricCell(metrics, 'tree', 'accuracy', 'abc'), 0.9);
  assert.equal(metricCell(metrics, 'tree', 'accuracy', 'other tree'), null);
  assert.equal(metricCell(metrics, 'tree', 'coverage', 'abc'), null);
  assert.equal(metricCell(metrics, 'tree', 'macro_f1', 'abc'), null);
  assert.equal(metricCell(metrics, 'baseline', 'accuracy', 'other tree'), 0, 'a real zero stays zero');
  assert.equal(metricCell(metrics, 'baseline', 'red_recall', 'abc'), null);
  assert.equal(metricCell(null, 'baseline', 'accuracy', 'abc'), null);
  assert.equal(metricCell({ baseline: [] }, 'baseline', 'accuracy', 'abc'), null);
});

test('audio is offered only for listed clips of known message keys', () => {
  assert.deepEqual([...audioKeys(CONTRACT, { en: ['band_green', 'not_a_key', 7] }, 'en')], ['band_green']);
  assert.equal(audioKeys(CONTRACT, { en: ['band_green'] }, 'tw').size, 0);
  assert.equal(audioKeys(CONTRACT, null, 'en').size, 0);
  assert.equal(audioKeys(CONTRACT, { en: 'band_green' }, 'en').size, 0);
});

test('the SMS draft comes only with results that carry an action', () => {
  for (const band of CONTRACT.bands) {
    assert.equal(offersSms(CONTRACT, band.name), CONTRACT.actions.band_default[band.name] !== null, band.name);
  }
  assert.equal(offersSms(CONTRACT, 'purple'), false);
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

test('the only hard-coded strings are the documented "Reload" label and "SankofaFresh" title on the error screen', () => {
  const source = read('web/app.js');
  assert.deepEqual([...source.matchAll(/'aria-label':\s*'([^']*)'/g)].map(match => match[1]), [],
    'labels come from the messages files');
  assert.equal([...source.matchAll(/'Reload'/g)].length, 1, 'only RELOAD_LABEL spells it out');
  assert.match(source, /const RELOAD_LABEL = 'Reload';/);
  assert.equal([...source.matchAll(/'SankofaFresh'/g)].length, 1, 'only APP_TITLE spells it out');
  assert.match(source, /const APP_TITLE = 'SankofaFresh';/);
  assert.deepEqual([...source.matchAll(/document\.title = ([^;]+);/g)].map(match => match[1]).sort(), ['APP_TITLE', 'screen.title'],
    'every other page title comes from a screen built from messages');
  const docs = read('docs/contracts_v2.md');
  assert.ok(docs.includes('hard-coded aria-label "Reload"'), 'the label exception is documented');
  assert.ok(docs.includes('hard-coded app name "SankofaFresh"'), 'the title exception is documented');
});

test('every icon app.js asks for is drawn in index.html', () => {
  const html = read('web/index.html');
  const source = read('web/app.js');
  const drawn = new Set([...html.matchAll(/<symbol id="i-([a-z_-]+)"/g)].map(match => match[1]));
  const named = [...source.matchAll(/icon\('([a-z_-]+)'/g)].map(match => match[1]);
  for (const name of named) assert.ok(drawn.has(name), name);
  for (const band of CONTRACT.bands) assert.ok(drawn.has(`band-${band.name}`), band.name);
});
