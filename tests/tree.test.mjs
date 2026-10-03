// Unit tests for web/tree.js against tests/fixtures/sample_tree.json and hand-built trees.
// Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { canonicalNodes } from '../web/canonical.js';
import { ABSTAIN_BAND, TreeIntegrityError, checkStructure, predict, verifyTree } from '../web/tree.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const CONTRACT = JSON.parse(read('web/contract.json'));
const DEMO = JSON.parse(read('tests/fixtures/demo_batches.json'));
// Node 18 has no global crypto; browsers pass nothing and use window.crypto.subtle.
const SUBTLE = webcrypto.subtle;
const RH14_MEAN = CONTRACT.features.findIndex(feature => feature.name === 'rh14_mean');

const sampleTree = () => JSON.parse(read('tests/fixtures/sample_tree.json'));

function withHash(tree) {
  tree.sha256 = createHash('sha256').update(canonicalNodes(tree.nodes), 'utf8').digest('hex');
  return tree;
}

function vector(overrides = {}) {
  const features = CONTRACT.features.map(() => 0);
  for (const [name, value] of Object.entries(overrides)) {
    features[CONTRACT.features.findIndex(feature => feature.name === name)] = value;
  }
  return features;
}

function nextFloat32Up(value) {
  const bits = new Float32Array([value]);
  new Uint32Array(bits.buffer)[0] += 1;
  return bits[0];
}

// Two adjacent float32 values a < b whose float64 midpoint rounds to b under ties-to-even: there a plain
// float64 comparison says left (x == threshold) but scikit-learn's float32 cast says right.
function midpointThatRoundsUp() {
  for (let a = Math.fround(0.45); ; a = nextFloat32Up(a)) {
    const b = nextFloat32Up(a);
    const midpoint = (a + b) / 2;
    if (Math.fround(midpoint) === b) return { a, b, midpoint };
  }
}

test('the abstain band is the contract abstention band', () => {
  assert.equal(ABSTAIN_BAND, CONTRACT.abstention.band);
  assert.deepEqual(sampleTree().classes, CONTRACT.classes);
  assert.deepEqual(sampleTree().feature_names, CONTRACT.features.map(feature => feature.name));
});

test('the sample tree verifies and is frozen once verified', async () => {
  const tree = await verifyTree(sampleTree(), SUBTLE);
  assert.ok(Object.isFrozen(tree) && Object.isFrozen(tree.nodes[2].value));
  assert.throws(() => {
    tree.nodes[2].value[0] = 1;
  }, TypeError);
});

test('the default Web Crypto is used when the runtime has one', { skip: !globalThis.crypto?.subtle }, async () => {
  await verifyTree(sampleTree());
});

test('a tree whose nodes or stored hash changed is refused', async () => {
  const tampered = sampleTree();
  tampered.nodes[2].value = [0.1, 0.2, 0.7];
  await assert.rejects(verifyTree(tampered, SUBTLE), TreeIntegrityError);
  const moved = sampleTree();
  moved.nodes[0].threshold = 80.6;
  await assert.rejects(verifyTree(moved, SUBTLE), /hash mismatch/);
  const wrongHash = sampleTree();
  wrongHash.sha256 = '0'.repeat(64);
  await assert.rejects(verifyTree(wrongHash, SUBTLE), /hash mismatch/);
});

test('without Web Crypto the tree is refused, not trusted', async () => {
  await assert.rejects(verifyTree(sampleTree(), null), /Web Crypto is unavailable/);
  await assert.rejects(verifyTree(sampleTree(), {}), /Web Crypto is unavailable/);
});

test('malformed trees are refused before hashing', () => {
  const cases = {
    'not an object': () => null,
    'old schema': tree => ({ ...tree, schema_version: 1 }),
    'cut of zero': tree => ({ ...tree, abstain_cut: 0 }),
    'cut above one': tree => ({ ...tree, abstain_cut: 1.5 }),
    'short hash': tree => ({ ...tree, sha256: 'abc' }),
    'duplicate class': tree => ({ ...tree, classes: ['green', 'green', 'red'] }),
    'missing range': tree => {
      const ranges = { ...tree.feature_ranges };
      delete ranges.t14_mean;
      return { ...tree, feature_ranges: ranges };
    },
    'reversed range': tree => ({ ...tree, feature_ranges: { ...tree.feature_ranges, days_drying: [30, 0] } }),
    'no nodes': tree => ({ ...tree, nodes: [] }),
    'id not position': tree => ({ ...tree, nodes: [tree.nodes[0], { ...tree.nodes[1], id: 5 }, tree.nodes[2]] }),
    'leaf with extra key': tree => ({ ...tree, nodes: [tree.nodes[0], { ...tree.nodes[1], samples: 9 }, tree.nodes[2]] }),
    'short leaf': tree => ({ ...tree, nodes: [tree.nodes[0], { id: 1, value: [0.5, 0.5] }, tree.nodes[2]] }),
    'leaf not summing to 1': tree => ({ ...tree, nodes: [tree.nodes[0], { id: 1, value: [0.5, 0.4, 0.05] }, tree.nodes[2]] }),
    'negative probability': tree => ({ ...tree, nodes: [tree.nodes[0], { id: 1, value: [1.1, -0.1, 0] }, tree.nodes[2]] }),
    'unknown feature': tree => ({ ...tree, nodes: [{ ...tree.nodes[0], feature: 9 }, tree.nodes[1], tree.nodes[2]] }),
    'string threshold': tree => ({ ...tree, nodes: [{ ...tree.nodes[0], threshold: '80.5' }, tree.nodes[1], tree.nodes[2]] }),
    'child is the root': tree => ({ ...tree, nodes: [{ ...tree.nodes[0], left: 0 }, tree.nodes[1], tree.nodes[2]] }),
    'child out of range': tree => ({ ...tree, nodes: [{ ...tree.nodes[0], right: 3 }, tree.nodes[1], tree.nodes[2]] }),
    'node reached twice': tree => ({ ...tree, nodes: [{ ...tree.nodes[0], right: 1 }, tree.nodes[1], tree.nodes[2]] }),
    'unreachable node': tree => ({ ...tree, nodes: [...tree.nodes, { id: 3, value: [1, 0, 0] }] }),
    'cycle': tree => ({
      ...tree,
      nodes: [{ ...tree.nodes[0] }, { id: 1, feature: 0, threshold: 1, left: 2, right: 2 }, { id: 2, feature: 0, threshold: 1, left: 1, right: 1 }],
    }),
  };
  for (const [name, mutate] of Object.entries(cases)) {
    assert.throws(() => checkStructure(mutate(sampleTree())), TreeIntegrityError, name);
  }
  assert.doesNotThrow(() => checkStructure(sampleTree()));
  assert.throws(() => checkStructure(cases['child is the root'](sampleTree())), /split 0 left is not a node/);
});

test('predict refuses a tree that verifyTree did not return', async () => {
  const unverified = sampleTree();
  assert.throws(() => predict(unverified, vector()), /verifyTree/);
  const verified = await verifyTree(sampleTree(), SUBTLE);
  assert.throws(() => predict(structuredClone(verified), vector()), /verifyTree/);
});

test('predict accepts only a full vector of finite numbers', async () => {
  const tree = await verifyTree(sampleTree(), SUBTLE);
  for (const bad of [null, vector().slice(1), [...vector(), 0], vector({ rh14_mean: Number.NaN }), vector({ rh14_mean: '70' })]) {
    assert.throws(() => predict(tree, bad), TypeError);
  }
});

test('a value equal to the threshold goes left', async () => {
  const tree = await verifyTree(sampleTree(), SUBTLE);
  const result = predict(tree, vector({ rh14_mean: 80.5 }));
  assert.equal(result.leaf, 1);
  assert.deepEqual(result.path, [{ node: 0, feature: RH14_MEAN, name: 'rh14_mean', threshold: 80.5, value: 80.5, left: true }]);
  assert.deepEqual(result.probabilities, [0.8, 0.15, 0.05]);
  assert.equal(result.winner, 'green');
  assert.equal(result.band, 'green');
});

test('inputs are cast to float32 before comparing, as scikit-learn does', async () => {
  const tree = await verifyTree(sampleTree(), SUBTLE);
  // Above 80.5 as a float64, but the nearest float32 is 80.5 itself, so scikit-learn sends it left.
  const justAbove = 80.500001;
  assert.ok(justAbove > 80.5 && Math.fround(justAbove) === 80.5);
  assert.equal(predict(tree, vector({ rh14_mean: justAbove })).leaf, 1);
  assert.equal(predict(tree, vector({ rh14_mean: nextFloat32Up(80.5) })).leaf, 2);
});

test('an exported float64 midpoint threshold is compared exactly, never rounded', async () => {
  const { a, b, midpoint } = midpointThatRoundsUp();
  const tree = withHash({
    ...sampleTree(),
    nodes: [
      { id: 0, feature: RH14_MEAN, threshold: midpoint, left: 1, right: 2 },
      { id: 1, value: [1.0, 0.0, 0.0] },
      { id: 2, value: [0.0, 0.0, 1.0] },
    ],
  });
  await verifyTree(tree, SUBTLE);
  assert.equal(predict(tree, vector({ rh14_mean: a })).leaf, 1);
  assert.equal(predict(tree, vector({ rh14_mean: b })).leaf, 2);
  assert.equal(predict(tree, vector({ rh14_mean: midpoint })).leaf, 2, 'float32(midpoint) is b, which is above the threshold');
});

test('a winning probability equal to the cut keeps the band; below it abstains', async () => {
  const atCut = await verifyTree(sampleTree(), SUBTLE);
  const red = predict(atCut, vector({ rh14_mean: 90 }));
  assert.deepEqual([red.winner, red.probability, red.abstained, red.band], ['red', 0.6, false, 'red']);
  const stricter = await verifyTree({ ...sampleTree(), abstain_cut: 0.61 }, SUBTLE);
  const unsure = predict(stricter, vector({ rh14_mean: 90 }));
  assert.deepEqual([unsure.winner, unsure.abstained, unsure.band], ['red', true, ABSTAIN_BAND]);
});

test('ties between classes go to the first class, like numpy argmax', async () => {
  const tree = await verifyTree(withHash({
    ...sampleTree(),
    abstain_cut: 0.4,
    nodes: [
      { id: 0, feature: RH14_MEAN, threshold: 80.5, left: 1, right: 2 },
      { id: 1, value: [0.4, 0.4, 0.2] },
      { id: 2, value: [0.2, 0.4, 0.4] },
    ],
  }), SUBTLE);
  assert.equal(predict(tree, vector({ rh14_mean: 60 })).winner, 'green');
  assert.equal(predict(tree, vector({ rh14_mean: 90 })).winner, 'amber');
});

test('a deeper tree records every split on the path, root first', async () => {
  const drying = CONTRACT.features.findIndex(feature => feature.name === 'days_drying');
  const tree = await verifyTree(withHash({
    ...sampleTree(),
    nodes: [
      { id: 0, feature: RH14_MEAN, threshold: 80.5, left: 1, right: 4 },
      { id: 1, feature: drying, threshold: 7.5, left: 2, right: 3 },
      { id: 2, value: [0.1, 0.7, 0.2] },
      { id: 3, value: [0.9, 0.1, 0.0] },
      { id: 4, value: [0.0, 0.2, 0.8] },
    ],
  }), SUBTLE);
  const result = predict(tree, vector({ rh14_mean: 70, days_drying: 5 }));
  assert.equal(result.leaf, 2);
  assert.deepEqual(result.path.map(step => [step.node, step.name, step.left]), [[0, 'rh14_mean', true], [1, 'days_drying', true]]);
  assert.equal(result.band, 'amber');
});

test('the demo batches run through the sample tree', async () => {
  const tree = await verifyTree(sampleTree(), SUBTLE);
  for (const fixtureCase of DEMO.cases) {
    if (fixtureCase.expected.features === null) continue;
    const result = predict(tree, fixtureCase.expected.features);
    const expectedLeaf = Math.fround(fixtureCase.expected.features[RH14_MEAN]) <= 80.5 ? 1 : 2;
    assert.equal(result.leaf, expectedLeaf, fixtureCase.id);
  }
});

test('the interpreter has no way to reach the network', () => {
  const source = read('web/tree.js');
  for (const api of ['fetch', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'import(']) {
    assert.ok(!source.includes(api), api);
  }
});
