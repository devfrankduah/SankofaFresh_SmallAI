// The exact string Python hashes for tree.json: json.dumps(nodes, sort_keys=True, separators=(",", ":")).
// JSON.stringify can't produce it: it doesn't sort keys and writes the float 1.0 as "1", where Python writes
// "1.0". tests/test_canonical.mjs checks this module against strings Python produced.

// In tree.json these node fields are always Python floats; id, feature, left and right are always ints.
const FLOAT_FIELDS = new Set(['threshold', 'value']);

// repr() of a Python float. Both languages pick the same shortest round-trip digits; only the layout differs.
export function pythonFloatRepr(number) {
  if (typeof number !== 'number' || !Number.isFinite(number)) throw new Error(`not a finite number: ${number}`);
  if (number === 0) return Object.is(number, -0) ? '-0.0' : '0.0';
  const [mantissa, exponentText] = number.toExponential().split('e');
  const exponent = Number(exponentText);
  const sign = mantissa.startsWith('-') ? '-' : '';
  const digits = mantissa.replace('-', '').replace('.', '');
  if (exponent < -4 || exponent >= 16) {
    const fraction = digits.slice(1);
    const exponentDigits = String(Math.abs(exponent)).padStart(2, '0');
    return `${sign}${digits[0]}${fraction ? `.${fraction}` : ''}e${exponent < 0 ? '-' : '+'}${exponentDigits}`;
  }
  if (exponent < 0) return `${sign}0.${'0'.repeat(-exponent - 1)}${digits}`;
  const whole = digits.slice(0, exponent + 1).padEnd(exponent + 1, '0');
  const fraction = digits.slice(exponent + 1);
  return `${sign}${whole}.${fraction || '0'}`;
}

function pythonInt(number) {
  if (!Number.isSafeInteger(number)) throw new Error(`not an integer: ${number}`);
  return String(number);
}

function canonicalField(key, value) {
  if (!FLOAT_FIELDS.has(key)) return pythonInt(value);
  return Array.isArray(value) ? `[${value.map(pythonFloatRepr).join(',')}]` : pythonFloatRepr(value);
}

function canonicalNode(node) {
  // Node keys are ASCII, so the default sort matches Python's sort_keys.
  const keys = Object.keys(node).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalField(key, node[key])}`).join(',')}}`;
}

export function canonicalNodes(nodes) {
  if (!Array.isArray(nodes)) throw new Error('nodes must be an array');
  return `[${nodes.map(canonicalNode).join(',')}]`;
}
