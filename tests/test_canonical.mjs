// web/canonical.js must reproduce Python's canonical tree serialization exactly, so the app can verify
// the tree.json hash. tests/test_contract.py checks the fixture against Python itself.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canonicalNodes, pythonFloatRepr } from '../web/canonical.js';

const load = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8'));
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const fixture = load('tests/fixtures/canonical_nodes.json');

test('every float prints exactly as Python repr()', () => {
  const mismatches = fixture.float_reprs.filter(([number, repr]) => pythonFloatRepr(number) !== repr);
  assert.deepStrictEqual(mismatches, []);
});

test('tricky nodes serialize to the Python string and hash', () => {
  assert.equal(canonicalNodes(fixture.nodes), fixture.canonical);
  assert.equal(sha256(canonicalNodes(fixture.nodes)), fixture.sha256);
});

test('the sample tree hash verifies in JavaScript', () => {
  const tree = load('tests/fixtures/sample_tree.json');
  assert.equal(sha256(canonicalNodes(tree.nodes)), tree.sha256);
});

test('the shipped tree hash verifies in JavaScript, once a tree exists', (t) => {
  let tree;
  try {
    tree = load('web/tree.json');
  } catch {
    t.skip('web/tree.json does not exist yet');
    return;
  }
  assert.equal(sha256(canonicalNodes(tree.nodes)), tree.sha256);
});

test('non-finite numbers and non-integer ids are rejected', () => {
  assert.throws(() => pythonFloatRepr(Number.NaN));
  assert.throws(() => pythonFloatRepr(Number.POSITIVE_INFINITY));
  assert.throws(() => canonicalNodes([{ id: 0.5, value: [1] }]));
});
