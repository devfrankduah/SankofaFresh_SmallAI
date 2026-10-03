// Tests for the bundled demo batches (web/demo_batches.json) and how the app places them.
// Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { assessAnswers, demoBatchAnswers, placeDemoBatches } from '../web/app.js';
import { sanitizeRecords } from '../web/storage.js';
import { verifyTree } from '../web/tree.js';

const json = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const CONTRACT = json('web/contract.json');
const BUNDLED = json('web/demo_batches.json');
const SOURCE = json('evidence/demo_batches.json');
const LABELS = CONTRACT.inputs.find(input => input.name === 'batch_label').values;

test('the bundled demo batches are exactly the evidence demo batches', () => {
  assert.equal(BUNDLED.source, 'evidence/demo_batches.json');
  assert.deepEqual(
    BUNDLED.batches.map(batch => ({ id: batch.id, inputs: batch.inputs })),
    SOURCE.batches.map(batch => ({ id: batch.id, inputs: batch.inputs })),
    'regenerate web/demo_batches.json from evidence/demo_batches.json',
  );
});

test('every bundled demo batch is a complete set of allowed answers', () => {
  assert.equal(demoBatchAnswers(CONTRACT, BUNDLED).length, BUNDLED.batches.length);
});

test('the app gives each demo batch the band the evaluation recorded for the shipped tree', async () => {
  const tree = await verifyTree(json('web/tree.json'), webcrypto.subtle);
  assert.equal(tree.model_version, SOURCE.model_version, 'evidence/demo_batches.json was made with a different tree');
  const weather = json('web/weather.json');
  const abstain = CONTRACT.abstention.band;
  for (const batch of SOURCE.batches) {
    const outcome = assessAnswers(CONTRACT, batch.inputs, { tree, weather });
    if (batch.reason) assert.deepEqual([outcome.band, outcome.reasons], [abstain, [batch.reason]], batch.id);
    else assert.equal(outcome.band, batch.tree, batch.id);
  }
});

test('malformed demo entries are left out rather than loaded', () => {
  const [good] = BUNDLED.batches;
  const file = { batches: [good, null, { id: 'x' }, { id: 'y', inputs: { ...good.inputs, days_stored: 999 } }] };
  assert.deepEqual(demoBatchAnswers(CONTRACT, file), [good.inputs]);
  assert.deepEqual(demoBatchAnswers(CONTRACT, null), []);
  assert.deepEqual(demoBatchAnswers(CONTRACT, { batches: 'none' }), []);
});

test('demo batches keep their own labels on a fresh phone', () => {
  const answers = demoBatchAnswers(CONTRACT, BUNDLED);
  const placed = placeDemoBatches(CONTRACT, answers, []);
  assert.deepEqual(placed.map(entry => entry.label), answers.map(entry => entry.batch_label));
});

test('demo batches never take a label a real batch uses', () => {
  const answers = demoBatchAnswers(CONTRACT, BUNDLED);
  const own = answers.map(entry => entry.batch_label);
  const placed = placeDemoBatches(CONTRACT, answers, [own[0]]);
  const labels = placed.map(entry => entry.label);
  assert.ok(!labels.includes(own[0]));
  assert.equal(new Set(labels).size, labels.length);
  assert.deepEqual(labels.slice(1), own.slice(1), 'the others keep their own labels');
  for (const entry of placed) assert.equal(entry.answers.batch_label, entry.label);
  assert.equal(answers[0].batch_label, own[0], 'the bundled answers are not changed');
});

test('with too few free labels nothing is loaded', () => {
  const answers = demoBatchAnswers(CONTRACT, BUNDLED);
  assert.equal(placeDemoBatches(CONTRACT, answers, LABELS.slice(0, LABELS.length - answers.length + 1)), null);
  assert.ok(placeDemoBatches(CONTRACT, answers, LABELS.slice(0, LABELS.length - answers.length)));
});

test('the demo data mark survives storage and defaults to off', () => {
  const batch = { label: 'Batch 1', answers: {}, checkedAt: '2026-10-03T12:00:00.000Z', result: null, actions: [] };
  const records = sanitizeRecords(CONTRACT, { schema: 1, consent: true, language: null, batches: [
    { ...batch, demoData: true }, { ...batch, label: 'Batch 2' }, { ...batch, label: 'Batch 3', demoData: 'yes' },
  ] });
  assert.deepEqual(records.batches.map(entry => entry.demoData), [true, false, false]);
});
