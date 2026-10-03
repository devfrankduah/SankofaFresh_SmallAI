// Runs web/features.js on the shared fixtures. tests/test_encode.py holds model/contract.py to the same
// expected values, so passing both means Python and JavaScript encode identically.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { encode } from '../web/features.js';

const load = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8'));
const fixture = (name) => load(`tests/fixtures/${name}`);
const CONTRACT = load('web/contract.json');

function treeFor(spec) {
  if (spec === null) return null;
  const tree = fixture(spec.base);
  Object.assign(tree.feature_ranges, spec.feature_ranges ?? {});
  return tree;
}

function asExpected(result) {
  return { features: result.features, abstain_reason: result.abstainReason };
}

for (const name of ['demo_batches.json', 'out_of_range.json']) {
  const { weather_table: tableName, cases } = fixture(name);
  const table = fixture(tableName);
  for (const testCase of cases) {
    test(`${name} ${testCase.id}`, () => {
      const { features, abstain_reason: abstainReason } = testCase.expected;
      assert.deepStrictEqual(asExpected(encode(CONTRACT, testCase.inputs, table)), { features, abstain_reason: abstainReason });
    });
  }
}

for (const testCase of fixture('encode_cases.json').cases) {
  test(`encode_cases.json ${testCase.id}`, () => {
    const result = encode(CONTRACT, testCase.inputs, fixture(testCase.weather_table), treeFor(testCase.tree));
    assert.deepStrictEqual(asExpected(result), testCase.expected);
  });
}

test('feature order comes from the contract, not the code', () => {
  const reordered = structuredClone(CONTRACT);
  [reordered.features[0], reordered.features[1]] = [reordered.features[1], reordered.features[0]];
  const { cases, weather_table: tableName } = fixture('demo_batches.json');
  const table = fixture(tableName);
  const original = encode(CONTRACT, cases[1].inputs, table).features;
  const swapped = encode(reordered, cases[1].inputs, table).features;
  assert.deepStrictEqual(swapped, [original[1], original[0], ...original.slice(2)]);
});

test('a tree with different feature names is a build error', () => {
  const tree = fixture('sample_tree.json');
  tree.feature_names = [...tree.feature_names].reverse();
  const { cases, weather_table: tableName } = fixture('demo_batches.json');
  assert.throws(() => encode(CONTRACT, cases[0].inputs, fixture(tableName), tree), /feature_names/);
});

test('a malformed weather table is a build error', () => {
  const { cases } = fixture('demo_batches.json');
  const table = fixture('weather_sample.json');
  assert.throws(() => encode(CONTRACT, cases[0].inputs, { ...table, days: table.days.slice(1) }), /365 or 366/);
  const badRow = structuredClone(table);
  badRow.days[10].rh2m_mean = null;
  assert.throws(() => encode(CONTRACT, cases[0].inputs, badRow), /finite rh2m_mean/);
  const boolDay = structuredClone(table);
  boolDay.days[0].day_of_year = true;
  assert.throws(() => encode(CONTRACT, cases[0].inputs, boolDay), /day_of_year/);
});
