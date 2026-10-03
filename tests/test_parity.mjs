// AC04: web/tree.js must match scikit-learn exactly (leaf, predict_proba and band) on every held-out row and on
// boundary cases around each exported threshold. Expected values come from python -m model.parity, which
// tests/test_parity_fixture.py keeps in step with the committed tree.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const path = (relative) => new URL(`../${relative}`, import.meta.url);
const load = (relative) => JSON.parse(readFileSync(path(relative), 'utf8'));

if (!existsSync(path('web/tree.js'))) {
  test('parity with scikit-learn', (t) => t.skip('web/tree.js is not on main yet, so there is nothing to compare'));
} else {
  const { predict, verifyTree } = await import('../web/tree.js');
  // Node 18 has no global crypto; verifyTree takes Web Crypto's subtle explicitly.
  const subtle = globalThis.crypto?.subtle ?? (await import('node:crypto')).webcrypto.subtle;
  const tree = await verifyTree(load('web/tree.json'), subtle);
  const fixture = load('tests/fixtures/parity_cases.json');

  function heldOutFeatures() {
    const [header, ...lines] = readFileSync(path('data/batches.csv'), 'utf8').trimEnd().split('\n');
    const columns = header.split(',');
    const id = columns.indexOf('batch_id');
    const featureColumns = tree.feature_names.map((name) => columns.indexOf(`feature_${name}`));
    assert.ok(featureColumns.every((index) => index >= 0), 'batches.csv must have every feature column');
    return new Map(lines.map((line) => {
      const cells = line.split(',');
      return [cells[id], featureColumns.map((index) => Number(cells[index]))];
    }));
  }

  function check(features, expected, label) {
    const result = predict(tree, features);
    assert.equal(result.leaf, expected.leaf, `${label}: leaf`);
    assert.deepStrictEqual(result.probabilities, fixture.leaf_probabilities[String(expected.leaf)], `${label}: probabilities`);
    assert.equal(result.band, expected.band, `${label}: band`);
    return result;
  }

  test('the fixture describes the committed tree', () => {
    assert.equal(fixture.tree_sha256, tree.sha256, 'run python -m model.parity after retraining');
    assert.equal(fixture.abstain_cut, tree.abstain_cut);
  });

  test('every held-out row matches scikit-learn', () => {
    const features = heldOutFeatures();
    for (const expected of fixture.held_out) {
      assert.ok(features.has(expected.batch_id), `${expected.batch_id} is missing from batches.csv`);
      check(features.get(expected.batch_id), expected, expected.batch_id);
    }
    assert.ok(fixture.held_out.length >= 2880, 'all validation, test and stress rows');
  });

  test('threshold boundary cases match scikit-learn and fall on both sides', () => {
    for (const expected of fixture.boundary) {
      const result = check(expected.features, expected, `node ${expected.node} ${expected.kind}`);
      const step = result.path.find((entry) => entry.node === expected.node);
      if (expected.kind === 'largest_float32_at_or_below') assert.equal(step?.left, true, `node ${expected.node} below goes left`);
      if (expected.kind === 'smallest_float32_above') assert.equal(step?.left, false, `node ${expected.node} above goes right`);
    }
    const splits = tree.nodes.filter((node) => !Object.hasOwn(node, 'value')).length;
    assert.equal(fixture.boundary.length, splits * 4, 'four cases per split');
  });

  test('ties go to the first class, as in Python', async () => {
    const tieTree = await verifyTree(fixture.tie_tree, subtle);
    for (const expected of fixture.tie_cases) {
      const result = predict(tieTree, expected.features);
      assert.equal(result.leaf, expected.leaf);
      assert.equal(result.band, expected.band, `leaf ${expected.leaf}`);
    }
  });
}
