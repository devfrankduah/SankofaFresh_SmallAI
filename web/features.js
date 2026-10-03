// Feature encoding and input abstention rules (spec 5.2, and 5.3 rules 1 and 2), driven by web/contract.json.
// model/contract.py is the Python twin of this module. tests/test_encode_parity.mjs and tests/test_encode.py
// hold both to the same fixtures, so any change here needs the same change there.

const ISO_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MS_PER_DAY = 86400000;
const LAST_YEAR = 9999; // Python's date.max; later check dates are out of range in both languages.

function ruleReason(contract, ruleId) {
  return contract.abstention.rules.find((rule) => rule.id === ruleId).reason;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function utcDate(year, monthIndex, day) {
  // setUTCFullYear, unlike Date.UTC, does not turn years 0 to 99 into 1900 to 1999.
  const result = new Date(0);
  result.setUTCFullYear(year, monthIndex, day);
  return result;
}

export function parseIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return null;
  const parsed = utcDate(year, month - 1, day);
  const roundTrips = parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  return roundTrips ? parsed : null;
}

export function isAllowedValue(field, value) {
  if (field.type === 'choice') return typeof value === 'string' && field.values.includes(value);
  if (field.type === 'integer') {
    return typeof value === 'number' && Number.isInteger(value) && value >= field.min && value <= field.max;
  }
  if (field.type === 'date') return parseIsoDate(value) !== null;
  throw new Error(`unknown input type ${JSON.stringify(field.type)} in contract`);
}

export function validatedDays(weather, contract) {
  const days = weather !== null && typeof weather === 'object' ? weather.days : undefined;
  if (!Array.isArray(days) || (days.length !== 365 && days.length !== 366)) {
    throw new Error('weather table must have a days list with 365 or 366 rows');
  }
  const columns = Object.values(contract.weather_window.columns);
  days.forEach((row, position) => {
    if (row === null || typeof row !== 'object' || row.day_of_year !== position + 1) {
      throw new Error(`weather row ${position} must have day_of_year ${position + 1}`);
    }
    for (const column of columns) {
      if (!isFiniteNumber(row[column])) throw new Error(`weather row ${position} has no finite ${column}`);
    }
  });
  return days;
}

function sequentialMean(values) {
  // Plain left-to-right addition, the same order model/contract.py uses, so both languages get the same last bit.
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

function dayOfYear(day) {
  const firstOfYear = utcDate(day.getUTCFullYear(), 0, 1);
  return Math.round((day.getTime() - firstOfYear.getTime()) / MS_PER_DAY) + 1;
}

// Returns null when the check date falls after 9999-12-31, where Python's date arithmetic overflows.
export function weatherFeatures(storageStart, daysStored, weather, contract) {
  const days = validatedDays(weather, contract);
  const window = contract.weather_window;
  const start = parseIsoDate(storageStart);
  if (start === null) throw new Error(`storage_start ${JSON.stringify(storageStart)} is not a YYYY-MM-DD date`);
  const checkDate = new Date(start.getTime() + Math.trunc(daysStored) * MS_PER_DAY);
  if (checkDate.getUTCFullYear() > LAST_YEAR) return null;
  const endIndex = (dayOfYear(checkDate) - 1) % days.length;
  const rows = [];
  for (let offset = window.days - 1; offset >= 0; offset -= 1) {
    rows.push(days[(((endIndex - offset) % days.length) + days.length) % days.length]);
  }
  const values = {};
  for (const feature of contract.features) {
    if (feature.source !== 'weather') continue;
    const series = rows.map((row) => row[window.columns[feature.variable]]);
    if (feature.aggregate === 'mean') values[feature.name] = sequentialMean(series);
    else if (feature.aggregate === 'max') values[feature.name] = Math.max(...series);
    else throw new Error(`unknown weather aggregate ${JSON.stringify(feature.aggregate)} in contract`);
  }
  return values;
}

// Applies abstention rule 1, then rule 2, then builds the feature vector in contract order.
// Pass the loaded tree.json once a tree exists, so rule 2 also checks its feature_ranges.
export function encode(contract, inputs, weather, tree = null) {
  const outOfRange = { features: null, abstainReason: ruleReason(contract, 'out_of_range') };
  if (inputs === null || typeof inputs !== 'object' || Array.isArray(inputs)) return outOfRange;
  const fields = contract.inputs;
  const has = (name) => Object.prototype.hasOwnProperty.call(inputs, name);
  if (fields.some((field) => field.allows_dont_know && has(field.name) && inputs[field.name] === contract.dont_know_value)) {
    return { features: null, abstainReason: ruleReason(contract, 'dont_know') };
  }
  const keys = Object.keys(inputs);
  const sameKeys = keys.length === fields.length && fields.every((field) => has(field.name));
  if (!sameKeys || !fields.every((field) => isAllowedValue(field, inputs[field.name]))) return outOfRange;
  const window = contract.weather_window;
  const weatherValues = weatherFeatures(inputs[window.start_input], inputs[window.days_input], weather, contract);
  if (weatherValues === null) return outOfRange;
  const vector = contract.features.map((feature) => {
    if (feature.source === 'weather') return weatherValues[feature.name];
    // Adding 0 turns -0 into 0, matching Python's int(-0.0).
    if (feature.encoding === 'integer') return inputs[feature.input] + 0;
    if (feature.encoding === 'map') return feature.map[inputs[feature.input]];
    throw new Error(`unknown encoding ${JSON.stringify(feature.encoding)} in contract`);
  });
  if (tree !== null) {
    const names = contract.features.map((feature) => feature.name);
    const treeNames = tree.feature_names;
    if (!Array.isArray(treeNames) || treeNames.length !== names.length || treeNames.some((name, i) => name !== names[i])) {
      throw new Error('tree.json feature_names do not match the contract feature order');
    }
    for (let i = 0; i < names.length; i += 1) {
      const [low, high] = tree.feature_ranges[names[i]];
      if (!(vector[i] >= low && vector[i] <= high)) return outOfRange;
    }
  }
  return { features: vector, abstainReason: null };
}
