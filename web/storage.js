// On-device records (spec 3 and 11). Everything lives under one localStorage key, so delete-all is a
// single removeItem and a reload never sees half of an update. Nothing here touches the network.

export const STORAGE_KEY = 'sankofafresh.records';
// Records are keyed by the batch label input; docs/contracts_v2.md says it names the batch rather
// than describing the coffee, and the contract has no field that marks it.
export const BATCH_LABEL_INPUT = 'batch_label';
export const SCHEMA_VERSION = 1;
const PROBE_KEY = 'sankofafresh.probe';

export function emptyRecords() {
  return { consent: false, language: null, batches: [] };
}

// Reading window.localStorage itself throws in some privacy modes, so the lookup is guarded too.
export function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// Used for fixture previews and whenever the phone refuses storage, so the app runs the same way.
export function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => {
      values.set(key, String(value));
    },
    removeItem: key => {
      values.delete(key);
    },
  };
}

function isTimestamp(value) {
  return typeof value === 'string' && value !== '' && !Number.isNaN(new Date(value).getTime());
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Stored data is untrusted: an older app version, a manual edit or a half-written value must never
// put an unknown band, reason or action on screen. Anything the contract doesn't name is dropped.
export function sanitizeRecords(contract, raw) {
  const records = emptyRecords();
  if (!isPlainObject(raw) || raw.schema !== SCHEMA_VERSION) return records;
  records.consent = raw.consent === true;
  records.language = typeof raw.language === 'string' ? raw.language : null;
  const labelInput = contract.inputs.find(input => input.name === BATCH_LABEL_INPUT);
  const labels = new Set(labelInput ? labelInput.values : []);
  const bands = new Set(contract.bands.map(band => band.name));
  const reasons = new Set(contract.message_keys.filter(key => key.startsWith('reason_')));
  const actions = new Set(contract.recorded_actions);
  const seen = new Set();
  for (const batch of Array.isArray(raw.batches) ? raw.batches : []) {
    if (!isPlainObject(batch) || !labels.has(batch.label) || seen.has(batch.label)) continue;
    if (!isPlainObject(batch.answers) || !isTimestamp(batch.checkedAt)) continue;
    let result = null;
    if (isPlainObject(batch.result)) {
      const resultReasons = batch.result.reasons;
      const validReasons = Array.isArray(resultReasons) && resultReasons.every(reason => reasons.has(reason));
      if (!bands.has(batch.result.band) || !validReasons) continue;
      const { demo, weatherYear } = batch.result;
      result = {
        band: batch.result.band,
        reasons: [...resultReasons],
        demo: demo === true,
        weatherYear: Number.isInteger(weatherYear) ? weatherYear : null,
      };
    } else if (batch.result !== null) {
      continue;
    }
    const recorded = (Array.isArray(batch.actions) ? batch.actions : [])
      .filter(entry => isPlainObject(entry) && actions.has(entry.action) && isTimestamp(entry.at))
      .map(entry => ({ action: entry.action, at: entry.at }));
    seen.add(batch.label);
    records.batches.push({
      label: batch.label,
      answers: { ...batch.answers },
      checkedAt: batch.checkedAt,
      result,
      actions: recorded,
      demoData: batch.demoData === true,
    });
  }
  return records;
}

export class RecordStore {
  constructor(storage) {
    this.storage = storage;
    this.available = RecordStore.probe(storage);
  }

  // A store can exist and still refuse writes (full, or private browsing on older Safari).
  static probe(storage) {
    if (!storage) return false;
    try {
      storage.setItem(PROBE_KEY, '1');
      storage.removeItem(PROBE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  read(contract) {
    if (!this.available) return emptyRecords();
    try {
      const text = this.storage.getItem(STORAGE_KEY);
      return text === null ? emptyRecords() : sanitizeRecords(contract, JSON.parse(text));
    } catch {
      return emptyRecords();
    }
  }

  write(records) {
    if (!this.available) return false;
    try {
      const { consent, language, batches } = records;
      this.storage.setItem(STORAGE_KEY, JSON.stringify({ schema: SCHEMA_VERSION, consent, language, batches }));
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    if (!this.available) return false;
    try {
      this.storage.removeItem(STORAGE_KEY);
      return this.storage.getItem(STORAGE_KEY) === null;
    } catch {
      return false;
    }
  }
}
