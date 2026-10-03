// Interpreter for web/tree.json (spec 5.4, docs/contracts_v2.md). A tree runs only after verifyTree has
// checked its structure and its sha256; predict refuses any other object. No network access.
import { canonicalNodes } from './canonical.js';

export const ABSTAIN_BAND = 'not_sure';
const SCHEMA_VERSION = 2;
const SPLIT_KEYS = ['feature', 'id', 'left', 'right', 'threshold'];
const LEAF_KEYS = ['id', 'value'];
const SHA256_HEX = /^[0-9a-f]{64}$/;
const PROBABILITY_SUM_TOLERANCE = 1e-9;
const verifiedTrees = new WeakSet();

export class TreeIntegrityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TreeIntegrityError';
  }
}

function fail(message) {
  throw new TreeIntegrityError(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(object, sortedKeys) {
  const keys = Object.keys(object).sort();
  return keys.length === sortedKeys.length && keys.every((key, index) => key === sortedKeys[index]);
}

function isUniqueStringList(value) {
  return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item !== '')
    && new Set(value).size === value.length;
}

function checkNode(node, position, tree) {
  if (!isPlainObject(node) || node.id !== position) fail(`node ${position} must be an object whose id is ${position}`);
  const count = tree.nodes.length;
  if (Object.hasOwn(node, 'value')) {
    if (!hasExactKeys(node, LEAF_KEYS)) fail(`leaf ${position} must have only id and value`);
    const { value } = node;
    if (!Array.isArray(value) || value.length !== tree.classes.length) fail(`leaf ${position} needs one probability per class`);
    if (!value.every(p => typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 1)) {
      fail(`leaf ${position} probabilities must be numbers from 0 to 1`);
    }
    let total = 0;
    for (const p of value) total += p;
    if (Math.abs(total - 1) >= PROBABILITY_SUM_TOLERANCE) fail(`leaf ${position} probabilities must sum to 1`);
    return;
  }
  if (!hasExactKeys(node, SPLIT_KEYS)) fail(`split ${position} must have exactly id, feature, threshold, left and right`);
  if (!Number.isInteger(node.feature) || node.feature < 0 || node.feature >= tree.feature_names.length) {
    fail(`split ${position} names a feature that does not exist`);
  }
  if (typeof node.threshold !== 'number' || !Number.isFinite(node.threshold)) fail(`split ${position} needs a finite threshold`);
  for (const side of ['left', 'right']) {
    if (!Number.isInteger(node[side]) || node[side] <= 0 || node[side] >= count) fail(`split ${position} ${side} is not a node`);
  }
}

// Every node reachable from the root exactly once also rules out cycles, so predict always ends.
function checkReachability(nodes) {
  const seen = new Set();
  const stack = [0];
  while (stack.length > 0) {
    const id = stack.pop();
    if (seen.has(id)) fail(`node ${id} is reached more than once`);
    seen.add(id);
    const node = nodes[id];
    if (!Object.hasOwn(node, 'value')) stack.push(node.left, node.right);
  }
  if (seen.size !== nodes.length) fail('some nodes cannot be reached from the root');
}

export function checkStructure(tree) {
  if (!isPlainObject(tree)) fail('tree.json is not an object');
  if (tree.schema_version !== SCHEMA_VERSION) fail(`schema_version must be ${SCHEMA_VERSION}`);
  if (typeof tree.model_version !== 'string' || tree.model_version === '') fail('model_version is missing');
  if (!isUniqueStringList(tree.feature_names)) fail('feature_names must be distinct names');
  if (!isUniqueStringList(tree.classes)) fail('classes must be distinct names');
  if (typeof tree.abstain_cut !== 'number' || !(tree.abstain_cut > 0 && tree.abstain_cut <= 1)) {
    fail('abstain_cut must be above 0 and at most 1');
  }
  if (typeof tree.sha256 !== 'string' || !SHA256_HEX.test(tree.sha256)) fail('sha256 must be 64 lowercase hex digits');
  if (!isPlainObject(tree.feature_ranges) || !hasExactKeys(tree.feature_ranges, [...tree.feature_names].sort())) {
    fail('feature_ranges must give a range for every feature');
  }
  for (const name of tree.feature_names) {
    const range = tree.feature_ranges[name];
    const valid = Array.isArray(range) && range.length === 2 && range.every(Number.isFinite) && range[0] <= range[1];
    if (!valid) fail(`feature_ranges.${name} must be [low, high]`);
  }
  if (!Array.isArray(tree.nodes) || tree.nodes.length === 0) fail('nodes must be a non-empty array');
  tree.nodes.forEach((node, position) => checkNode(node, position, tree));
  checkReachability(tree.nodes);
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Resolves to the same object, frozen so it can't change after its hash was checked.
// Web Crypto exists only in secure contexts (https or localhost); without it the tree is refused.
export async function verifyTree(tree, subtle = globalThis.crypto?.subtle) {
  checkStructure(tree);
  if (!subtle || typeof subtle.digest !== 'function') fail('Web Crypto is unavailable, so the tree hash cannot be checked');
  deepFreeze(tree);
  let canonical;
  try {
    canonical = canonicalNodes(tree.nodes);
  } catch (error) {
    fail(`nodes cannot be serialized for hashing: ${error.message}`);
  }
  const digest = toHex(await subtle.digest('SHA-256', new TextEncoder().encode(canonical)));
  if (digest !== tree.sha256) fail(`tree.json hash mismatch: computed ${digest}, stored ${tree.sha256}`);
  verifiedTrees.add(tree);
  return tree;
}

// scikit-learn compares float32 inputs against float64 thresholds and goes left when x <= threshold;
// Math.fround reproduces the float32 cast. Ties between classes go to the first class, like numpy argmax.
export function predict(tree, features) {
  if (!verifiedTrees.has(tree)) throw new TreeIntegrityError('predict needs a tree returned by verifyTree');
  if (!Array.isArray(features) || features.length !== tree.feature_names.length
    || !features.every(value => typeof value === 'number' && Number.isFinite(value))) {
    throw new TypeError(`features must be ${tree.feature_names.length} finite numbers in contract order`);
  }
  const path = [];
  let node = tree.nodes[0];
  while (!Object.hasOwn(node, 'value')) {
    const value = features[node.feature];
    const left = Math.fround(value) <= node.threshold;
    path.push({ node: node.id, feature: node.feature, name: tree.feature_names[node.feature], threshold: node.threshold, value, left });
    node = tree.nodes[left ? node.left : node.right];
  }
  const probabilities = [...node.value];
  let best = 0;
  for (let index = 1; index < probabilities.length; index += 1) {
    if (probabilities[index] > probabilities[best]) best = index;
  }
  const probability = probabilities[best];
  const abstained = probability < tree.abstain_cut;
  const winner = tree.classes[best];
  return { probabilities, winner, probability, abstained, band: abstained ? ABSTAIN_BAND : winner, leaf: node.id, path };
}
