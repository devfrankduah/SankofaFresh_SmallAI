// SankofaFresh screens. Everything the farmer reads comes from messages.<lang>.json, and every
// question, option, band and rule comes from contract.json at runtime.

import { encode, parseIsoDate, validatedDays } from './features.js';
import { BATCH_LABEL_INPUT, RecordStore, STORAGE_KEY, browserStorage, emptyRecords, memoryStorage } from './storage.js';
import { TreeIntegrityError, predict, verifyTree } from './tree.js';

const VIEWS = new Set(['batches', 'check', 'result', 'settings', 'evidence', 'how']);
const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/;
const SVG_NS = 'http://www.w3.org/2000/svg';
// Only reachable when the repository root is served; the deployed web/ folder has no tests/.
const FIXTURE_FILES = ['../tests/fixtures/demo_batches.json', '../tests/fixtures/out_of_range.json'];
// Stands in for web/tree.json until the trained tree ships, with demo_model_note on every result it gives.
// Like the fixtures it is only reachable when the repository root is served.
const SAMPLE_TREE_URL = '../tests/fixtures/sample_tree.json';
const SECONDS_TO_SHOW_COPIED = 2;
// Must match CACHE_PREFIX in sw.js; tests/sw.test.mjs checks that it does.
export const CACHE_PREFIX = 'sankofafresh-';

// The welcome explainer, in order: the message key for each step and the picture drawn for it.
export const HOW_STEPS = [
  ['how_step_answer', 'sack'],
  ['how_step_weather', 'weather'],
  ['how_step_result', 'stamp'],
];

export async function fetchJson(url, fetchImplementation = globalThis.fetch) {
  const response = await fetchImplementation(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

// null only when the file is not there (HTTP 404); any other failure is an error.
export async function fetchOptionalText(url, fetchImplementation = globalThis.fetch) {
  const response = await fetchImplementation(url);
  // Reading the 404 body keeps an abandoned response from showing as a failed request in devtools.
  if (response.status === 404) {
    await response.text();
    return null;
  }
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

// Metrics and the audio index are optional: anything other than readable JSON means "not there".
export async function loadOptionalJson(url, fetchImplementation = globalThis.fetch) {
  try {
    const text = await fetchOptionalText(url, fetchImplementation);
    return text === null ? null : JSON.parse(text);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// A tree.json that exists but is broken is an integrity failure, never a reason to fall back to the
// sample tree; only a missing tree.json does that.
export async function loadModel(contract, { fetchImplementation = globalThis.fetch, subtle = globalThis.crypto?.subtle } = {}) {
  const model = { tree: null, treeBytes: 0, demo: false, weather: null, weatherYear: null, error: null };
  try {
    const weather = await fetchJson('weather.json', fetchImplementation);
    validatedDays(weather, contract);
    model.weather = weather;
    model.weatherYear = Number.isInteger(weather.year) ? weather.year : null;
  } catch (error) {
    console.error(error);
    model.error = 'error_files';
  }
  try {
    let text = await fetchOptionalText('tree.json', fetchImplementation);
    let demo = false;
    if (text === null) {
      text = await fetchOptionalText(SAMPLE_TREE_URL, fetchImplementation);
      demo = true;
    }
    if (text === null) throw new Error('tree.json is missing and the sample tree is not reachable');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new TreeIntegrityError('tree.json is not valid JSON');
    }
    model.tree = await verifyTree(parsed, subtle);
    model.treeBytes = new TextEncoder().encode(text).length;
    model.demo = demo;
  } catch (error) {
    console.error(error);
    model.error = error instanceof TreeIntegrityError ? 'error_model_check' : model.error ?? 'error_files';
  }
  return model;
}

// Spec 5.5: reasons come from splits on the decision path that pushed toward risk, so each one is
// true of this batch. A feature's "risk" says which side of a split its reason describes.
export function reasonsFromPath(contract, path, limit = 2) {
  const reasons = [];
  for (const step of path) {
    const feature = contract.features.find(candidate => candidate.name === step.name);
    if (!feature || typeof feature.reason !== 'string') continue;
    const onRiskSide = (feature.risk === 'higher' && !step.left) || (feature.risk === 'lower' && step.left);
    if (onRiskSide && !reasons.includes(feature.reason)) reasons.push(feature.reason);
    if (reasons.length === limit) break;
  }
  return reasons;
}

// Rules 1 and 2 (features.js), then the tree with rule 3 (tree.js). Throws when the answers need a
// model the app could not load; the caller saves the answers without a result.
export function assessAnswers(contract, answers, { tree, weather }) {
  const { band: abstainBand, rules } = contract.abstention;
  const encoded = encode(contract, answers, weather, tree);
  if (encoded.abstainReason) return { band: abstainBand, reasons: [encoded.abstainReason], predicted: false };
  if (!tree) throw new Error('no verified tree to run');
  const prediction = predict(tree, encoded.features);
  if (prediction.abstained) {
    return { band: abstainBand, reasons: [rules.find(rule => rule.id === 'low_confidence').reason], predicted: true };
  }
  // Spec 5.6: the band with no default action (green) shows no reasons, since every reason describes a risk.
  const showsReasons = contract.actions.band_default[prediction.band] !== null;
  return { band: prediction.band, reasons: showsReasons ? reasonsFromPath(contract, prediction.path) : [], predicted: true };
}

export function metricCell(metrics, column, name, treeSha256) {
  if (!isPlainObject(metrics) || !isPlainObject(metrics[column])) return null;
  // Tree numbers describe one specific model; for any other tree they are not evaluated.
  if (column === 'tree' && metrics.tree_sha256 !== treeSha256) return null;
  const value = metrics[column][name];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

export function audioKeys(contract, index, code) {
  if (!isPlainObject(index) || !Array.isArray(index[code])) return new Set();
  return new Set(index[code].filter(key => contract.message_keys.includes(key)));
}

// The bundled demo batches (web/demo_batches.json) must each be a complete set of allowed answers.
export function demoBatchAnswers(contract, demoFile) {
  if (!isPlainObject(demoFile) || !Array.isArray(demoFile.batches)) return [];
  return demoFile.batches
    .map(batch => (isPlainObject(batch) && isPlainObject(batch.inputs) ? { ...batch.inputs } : null))
    .filter(answers => answers !== null && firstUnanswered(contract, answers) === null);
}

// Demo batches never take a label a real batch uses: each keeps its own label when that is free and
// otherwise takes the first free one. null when there aren't enough free labels for all of them.
export function placeDemoBatches(contract, demoAnswers, usedLabels) {
  const free = freeBatchLabels(contract, usedLabels);
  if (free.length < demoAnswers.length) return null;
  const placed = demoAnswers.map(answers => (free.includes(answers[BATCH_LABEL_INPUT]) ? answers[BATCH_LABEL_INPUT] : null));
  const claimed = new Set(placed.filter(Boolean));
  const spare = free.filter(label => !claimed.has(label));
  return demoAnswers.map((answers, index) => {
    const label = placed[index] ?? spare.shift();
    return { label, answers: { ...answers, [BATCH_LABEL_INPUT]: label } };
  });
}

// Icons for the "why" chips, by reason message key. A reason without one keeps the generic mark.
export const REASON_ICONS = {
  reason_rewetted: 'rain',
  reason_damp_check: 'hand',
  reason_floor: 'floor',
  reason_humid_weeks: 'humid',
  reason_musty: 'smell',
  reason_short_drying: 'sun',
  reason_long_storage: 'storage',
  reason_missing_input: 'question',
  reason_out_of_range: 'range',
  reason_low_confidence: 'scale',
};

export function reasonIcon(key) {
  return Object.hasOwn(REASON_ICONS, key) ? REASON_ICONS[key] : 'reason';
}

// Pictures for the one-question-per-screen form: one per question, one per answer.
export const QUESTION_ART = {
  batch_label: 'sack',
  days_drying: 'sun',
  rewetted: 'rain',
  storage_surface: 'raised',
  musty_smell: 'smell',
  dryness_check: 'hand',
  days_stored: 'storage',
  storage_start: 'storage',
};

export const OPTION_ICONS = {
  yes: 'check',
  no: 'cross',
  floor: 'floor',
  raised: 'raised',
  dry: 'sun',
  unsure: 'half',
  damp: 'humid',
  dont_know: 'question',
};

// Each action's picture: the sun over a drying bed, the pallet, a person carrying a sample.
export const ACTION_ART = {
  action_redry: 'redry',
  action_raise_bags: 'raised',
  action_test_sample: 'carry',
};

// Daily mean humidity above this many percent counts as very damp air: the FAO point at which stored
// coffee starts taking up water (spec 7), and the line drawn on the humidity chart.
export const DAMP_AIR_PERCENT = 80;

// One entry per day of the window, oldest first: 'damp' above the mark, 'dry' at or below it.
export function weatherDays(values, mark = DAMP_AIR_PERCENT) {
  if (!Array.isArray(values)) return null;
  return values.map(value => (value > mark ? 'damp' : 'dry'));
}

const MS_PER_DAY = 86400000;

// The daily humidity values behind this batch's weather features, oldest first: the window rule in
// docs/contracts_v2.md, which features.js applies too. tests/result.test.mjs holds the two to the same
// rh14_mean and rh14_max for every day of the year. null when the answers or the table can't give one.
export function humiditySeries(contract, answers, weather) {
  const rule = contract.weather_window;
  const start = parseIsoDate(answers?.[rule.start_input]);
  const daysStored = answers?.[rule.days_input];
  const days = weather?.days;
  if (!start || !Number.isInteger(daysStored) || daysStored < 0 || !Array.isArray(days) || days.length === 0) return null;
  const check = new Date(start.getTime() + daysStored * MS_PER_DAY);
  const firstOfYear = new Date(0);
  firstOfYear.setUTCFullYear(check.getUTCFullYear(), 0, 1);
  const endIndex = Math.round((check.getTime() - firstOfYear.getTime()) / MS_PER_DAY) % days.length;
  const column = rule.columns.RH2M;
  const values = [];
  for (let offset = rule.days - 1; offset >= 0; offset -= 1) {
    const row = days[(((endIndex - offset) % days.length) + days.length) % days.length];
    values.push(row?.[column]);
  }
  return values.every(value => typeof value === 'number' && Number.isFinite(value)) ? values : null;
}

function calendarDayNumber(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return Math.round(date.getTime() / MS_PER_DAY);
}

// Whole days from one calendar date to another (both YYYY-MM-DD); negative when "from" is later.
export function daysBetween(from, to) {
  if (!isCalendarDate(from) || !isCalendarDate(to)) return null;
  return calendarDayNumber(to) - calendarDayNumber(from);
}

export function isFutureDate(isoDate, today) {
  const days = daysBetween(isoDate, today);
  return days !== null && days < 0;
}

// The form asks for the bagging date only (iOS ignores max on date inputs, and two linked answers
// invited mistakes). The day count the contract also needs is worked out from it to today.
export function askedInputs(contract) {
  return contract.inputs.filter(input => input.name !== contract.weather_window.days_input);
}

export function withComputedDays(contract, answers, today) {
  const { start_input: start, days_input: days } = contract.weather_window;
  const complete = { ...answers };
  if (answers[start] === contract.dont_know_value) {
    complete[days] = contract.dont_know_value;
    return complete;
  }
  const count = daysBetween(answers[start], today);
  if (count === null || count < 0) delete complete[days];
  else complete[days] = count;
  return complete;
}

// Points for an axis-free line: values outside low..high sit on the edge instead of leaving the box.
export function sparklinePoints(values, { width, height, low, high }) {
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const y = value => height - ((Math.min(high, Math.max(low, value)) - low) / (high - low)) * height;
  return values.map((value, index) => [Number((index * step).toFixed(1)), Number(y(value).toFixed(1))]);
}

// Worst first: the result classes from most to least risky among those that come with an action, then
// the abstention band, then batches with no result yet, then classes with no action (green).
export function bandRank(contract, band) {
  const { classes, abstention, actions } = contract;
  if (band === null) return classes.length;
  if (band === abstention.band) return classes.length - 1;
  const index = classes.indexOf(band);
  if (index === -1) return classes.length + 2;
  return actions.band_default[band] === null ? classes.length + 1 : classes.length - 1 - index;
}

// A batch needs a check when its last result came with an action, or when it has no result at all.
export function needsCheck(contract, batch) {
  return !batch.result || offersSms(contract, batch.result.band);
}

// The SMS asks the cooperative to check the batch, so it only fits results that come with an action.
export function offersSms(contract, band) {
  return Object.hasOwn(contract.actions.band_default, band) && contract.actions.band_default[band] !== null;
}

export function requireContract(contract) {
  const problems = [];
  if (!contract || typeof contract !== 'object') return ['contract is not an object'];
  if (!Array.isArray(contract.inputs) || contract.inputs.length === 0) problems.push('inputs missing');
  if (!Array.isArray(contract.message_keys)) problems.push('message_keys missing');
  if (!Array.isArray(contract.bands)) problems.push('bands missing');
  if (!contract.abstention || typeof contract.abstention.band !== 'string') problems.push('abstention.band missing');
  if (!contract.actions || typeof contract.actions.reason_action !== 'object' || typeof contract.actions.band_default !== 'object') {
    problems.push('actions missing');
  }
  if (typeof contract.dont_know_value !== 'string') problems.push('dont_know_value missing');
  if (!Array.isArray(contract.recorded_actions)) problems.push('recorded_actions missing');
  if (!Array.isArray(contract.features) || !Array.isArray(contract.metrics)) problems.push('features or metrics missing');
  const label = Array.isArray(contract.inputs) ? contract.inputs.find(input => input.name === BATCH_LABEL_INPUT) : null;
  if (!label || label.type !== 'choice' || !Array.isArray(label.values) || label.values.length === 0) {
    problems.push(`${BATCH_LABEL_INPUT} must be a choice input with values`);
  }
  return problems;
}

export function languageCandidates(contract, bootstrapCode) {
  const listed = Array.isArray(contract.languages) ? contract.languages : [bootstrapCode];
  return [...new Set(listed.filter(code => typeof code === 'string' && LANGUAGE_CODE.test(code)))];
}

// docs/contracts_v2.md: a messages file with a top-level _status is an unreviewed draft. It is never
// offered, even if a contract were to list it.
export function hasEveryMessage(contract, messages) {
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) return false;
  if (Object.hasOwn(messages, '_status')) return false;
  return contract.message_keys.every(key => typeof messages[key] === 'string' && messages[key].trim() !== '');
}

// A language is offered only when its file loads and carries every contract key, so a
// half-translated file can never put an English gap or a missing reason on a result.
export async function loadLanguages(contract, codes, readJson) {
  const loaded = await Promise.all(codes.map(async code => {
    try {
      const messages = await readJson(`messages.${code}.json`);
      return hasEveryMessage(contract, messages) ? { code, messages } : null;
    } catch {
      return null;
    }
  }));
  return loaded.filter(Boolean);
}

export function fillPlaceholders(text, values) {
  return text.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(values, name) ? String(values[name]) : match));
}

export function isCalendarDate(value) {
  const match = typeof value === 'string' ? DATE_TEXT.exec(value) : null;
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1) return false;
  const date = new Date(0);
  // setUTCFullYear, not Date.UTC, because Date.UTC maps years 0 to 99 onto 1900 to 1999.
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidAnswer(input, value, dontKnowValue) {
  if (value === dontKnowValue) return input.allows_dont_know === true;
  switch (input.type) {
    case 'choice':
      return Array.isArray(input.values) && input.values.includes(value);
    case 'integer':
      return Number.isInteger(value) && value >= input.min && value <= input.max;
    case 'date':
      return isCalendarDate(value);
    default:
      return false;
  }
}

export function firstUnanswered(contract, answers) {
  const missing = contract.inputs.find(input => !isValidAnswer(input, answers[input.name], contract.dont_know_value));
  return missing ? missing.name : null;
}

// Stored answers can be stale or corrupted; anything the contract no longer allows is dropped
// so the form asks that question again instead of showing an impossible value.
export function keepValidAnswers(contract, answers) {
  const kept = {};
  if (!answers || typeof answers !== 'object') return kept;
  for (const input of contract.inputs) {
    if (isValidAnswer(input, answers[input.name], contract.dont_know_value)) kept[input.name] = answers[input.name];
  }
  return kept;
}

export function batchLabels(contract) {
  return contract.inputs.find(input => input.name === BATCH_LABEL_INPUT).values;
}

export function freeBatchLabels(contract, usedLabels) {
  const used = new Set(usedLabels);
  return batchLabels(contract).filter(label => !used.has(label));
}

export function pickAction(contract, band, reasons) {
  const { reason_action: reasonAction, band_default: bandDefault } = contract.actions;
  if (reasons.length > 0 && Object.hasOwn(reasonAction, reasons[0])) return reasonAction[reasons[0]];
  return Object.hasOwn(bandDefault, band) ? bandDefault[band] : null;
}

export function bandMessage(contract, band) {
  const entry = contract.bands.find(candidate => candidate.name === band);
  return entry ? entry.message : null;
}

export function parseRoute(hash) {
  const parts = String(hash ?? '').replace(/^#\/?/, '').split('/');
  const view = parts[0] === '' ? 'batches' : parts[0];
  if (!VIEWS.has(view)) return { view: 'batches', param: null };
  const raw = parts.slice(1).join('/');
  if (raw === '') return { view, param: null };
  try {
    return { view, param: decodeURIComponent(raw) };
  } catch {
    return { view: 'batches', param: null };
  }
}

export function routeHash(view, param = null) {
  return param === null ? `#/${view}` : `#/${view}/${encodeURIComponent(param)}`;
}

// Day first, as dates are written in Ghana, and with no month names, so no language is needed.
export function numericDate(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Languages whose month names a browser can be trusted to write, and the locale to write them in.
// Every other language (Twi among them) gets the numeric form, so no unchecked month name appears.
const DATE_LOCALES = { en: 'en-GH' };

// The one date formatter: day, month, year in that order on every screen ("3 Oct 2026", 03/10/2026).
// The named form is assembled from its parts, so no browser's locale data can put the month first.
export function formatFarmDate(date, languageCode) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const locale = Object.hasOwn(DATE_LOCALES, languageCode) ? DATE_LOCALES[languageCode] : null;
  if (locale) {
    try {
      const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(date);
      const part = type => parts.find(entry => entry.type === type)?.value;
      if (part('day') && part('month') && part('year')) return `${part('day')} ${part('month')} ${part('year')}`;
    } catch {
      // A browser without Intl date parts falls back to the numeric form below.
    }
  }
  return numericDate(date);
}

export function localDateString(date) {
  const pad = number => String(number).padStart(2, '0');
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Fixture previews take only the answers; results come from the same pipeline a farmer's check uses.
export function answersFromFixtures(contract, fixtures) {
  const labels = new Set(batchLabels(contract));
  const found = [];
  for (const fixture of fixtures) {
    for (const fixtureCase of Array.isArray(fixture?.cases) ? fixture.cases : []) {
      const label = fixtureCase?.inputs?.[BATCH_LABEL_INPUT];
      if (labels.has(label)) found.push({ label, answers: { ...fixtureCase.inputs } });
    }
  }
  return found;
}

function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'class') element.className = value;
    else if (name === 'text') element.textContent = value;
    else if (name.startsWith('on')) element.addEventListener(name.slice(2), value);
    else element.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) element.append(child);
  }
  return element;
}

function svg(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}

function icon(name, className = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon ${className}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

// The missing mark is an icon and a colour for sighted users; aria-invalid tells a screen reader the same.
function setMissing(fieldset, missing) {
  if (missing) fieldset.dataset.missing = 'true';
  else delete fieldset.dataset.missing;
  for (const control of fieldset.querySelectorAll('input')) {
    if (missing) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  }
}

class App {
  constructor({ contract, languages, store, model, metrics, audioIndex, demoAnswers }) {
    this.contract = contract;
    this.languages = languages;
    this.store = store;
    this.model = model;
    this.metrics = metrics;
    this.audioIndex = audioIndex;
    this.demoAnswers = demoAnswers;
    this.player = null;
    this.storageWorks = store.available;
    this.previousView = null;
    this.recordOpen = false;
    this.wizard = null;
    this.bar = document.getElementById('bar');
    this.main = document.getElementById('main');
    this.dock = document.getElementById('dock');
    this.applyRecords(store.read(contract));
  }

  // Only a language the farmer picked is saved, so a household that never chose one follows the
  // contract's default if a local language is added later.
  applyRecords(records) {
    this.consent = records.consent;
    this.chosenLanguage = this.languages.some(language => language.code === records.language) ? records.language : null;
    this.language = this.languages.find(language => language.code === this.chosenLanguage) ?? this.languages[0];
    this.batches = new Map(records.batches.map(batch => [batch.label, batch]));
  }

  persist() {
    const batches = batchLabels(this.contract).filter(label => this.batches.has(label)).map(label => this.batches.get(label));
    this.storageWorks = this.store.write({ consent: this.consent, language: this.chosenLanguage, batches });
    return this.storageWorks;
  }

  t(key, values) {
    const text = this.language.messages[key];
    if (typeof text !== 'string') throw new Error(`message ${key} is missing`);
    return values ? fillPlaceholders(text, values) : text;
  }

  // For keys the contract may add later; until it lists them the app shows no text for them.
  optionalText(key, values) {
    return this.contract.message_keys.includes(key) ? this.t(key, values) : null;
  }

  formatNumber(value) {
    try {
      return new Intl.NumberFormat(this.language.code).format(value);
    } catch {
      return String(value);
    }
  }

  formatDate(isoTimestamp) {
    return formatFarmDate(new Date(isoTimestamp), this.language.code);
  }

  formatShare(value) {
    try {
      return new Intl.NumberFormat(this.language.code, { style: 'percent', maximumFractionDigits: 1 }).format(value);
    } catch {
      return `${Math.round(value * 1000) / 10}%`;
    }
  }

  formatBytes(bytes) {
    try {
      return new Intl.NumberFormat(this.language.code, { style: 'unit', unit: 'kilobyte', maximumFractionDigits: 1 }).format(bytes / 1000);
    } catch {
      return `${Math.round(bytes / 100) / 10} kB`;
    }
  }

  async loadFixtures() {
    const fixtures = await Promise.all(FIXTURE_FILES.map(file => fetchJson(file)));
    const checkedAt = new Date().toISOString();
    for (const { label, answers } of answersFromFixtures(this.contract, fixtures)) {
      this.batches.set(label, { label, answers, checkedAt, result: this.runCheck(answers), actions: [], demoData: false });
    }
  }

  runCheck(answers) {
    try {
      const outcome = assessAnswers(this.contract, answers, this.model);
      return {
        band: outcome.band,
        reasons: outcome.reasons,
        demo: this.model.demo,
        weatherYear: outcome.predicted ? this.model.weatherYear : null,
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // Setting location.hash to the hash already showing fires no hashchange, so that case renders here.
  go(hash) {
    if (location.hash === hash) this.transition(() => this.render());
    else location.hash = hash;
  }

  // Screen and step changes cross-fade where the browser has View Transitions and motion is welcome.
  transition(update) {
    if (typeof document.startViewTransition !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update();
      return;
    }
    document.startViewTransition(update);
  }

  render(focusSelector = null) {
    const route = parseRoute(location.hash);
    if (route.view !== 'check') this.wizard = null;
    const screen = this.consent ? this.screenFor(route) : this.consentScreen();
    if (screen.redirect) {
      location.replace(screen.redirect);
      return;
    }
    document.documentElement.lang = this.language.code;
    document.title = screen.title;
    this.bar.replaceChildren(...this.renderBar(screen));
    // Screens may leave optional parts out as null; replaceChildren would print those as text.
    this.main.replaceChildren(...this.notices(), ...screen.body.filter(Boolean));
    this.dock.replaceChildren(...(screen.dock ?? []));
    this.dock.hidden = !screen.dock || screen.dock.length === 0;
    const routeKey = this.consent ? `${route.view}/${route.param ?? ''}` : 'consent';
    const arriving = this.previousView !== routeKey;
    if (arriving && route.view === 'result' && this.consent) this.landStamp();
    if (this.previousView !== routeKey) {
      if (this.previousView !== null) window.scrollTo(0, 0);
      this.recordOpen = false;
      this.stopAudio();
    }
    const target = [].concat(focusSelector ?? []).map(selector => document.querySelector(selector)).find(Boolean) ?? null;
    if (target) target.focus();
    else if (this.previousView !== null && this.previousView !== routeKey) this.main.focus({ preventScroll: true });
    this.previousView = routeKey;
  }

  // The one bold moment: the result stamp lands on the batch card. Never under reduced motion.
  landStamp() {
    const stamp = this.main.querySelector('.stamp');
    if (!stamp || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stamp.classList.add('is-landing');
    try {
      navigator.vibrate?.(30);
    } catch {
      // Vibration is a nicety; browsers that refuse it (no user gesture yet) just skip it.
    }
  }

  notices() {
    const keys = [];
    if (!this.storageWorks) keys.push('error_storage');
    if (this.model.error) keys.push(this.model.error);
    return keys.map(key => {
      const text = this.optionalText(key);
      return h('p', { class: 'notice', role: 'status' }, icon('alert'), text ? h('span', { text }) : null);
    });
  }

  // The first screen and the first thing in the video: the Sankofa mark, the name, the promise, the
  // offline chip, the two languages, then the consent text.
  consentScreen() {
    const name = this.optionalText('app_name');
    const chip = this.optionalText('offline_chip');
    // The promise in every language at once, so a visitor sees it is bilingual before choosing.
    const taglines = this.optionalText('app_tagline')
      ? this.languages.map(language => h('p', { class: 'welcome-tagline', lang: language.code, text: language.messages.app_tagline }))
      : [];
    const body = [h('section', { class: 'welcome' },
      icon('sankofa', 'welcome-mark'),
      h('h1', { class: 'welcome-name', text: name ?? this.t('title_consent') }),
      ...taglines,
      chip ? h('p', { class: 'offline-chip' }, icon('offline'), h('span', { text: chip })) : null)];
    if (this.languages.length > 1) body.push(this.languageTiles());
    body.push(this.howItWorks(true), h('p', { class: 'consent-text', text: this.t('consent_text') }));
    return {
      title: this.t('title_consent'),
      bare: true,
      body: body.filter(Boolean),
      dock: [h('button', { class: 'button button-primary', type: 'button', onclick: () => this.giveConsent() },
        icon('action'), h('span', { text: this.t('button_continue') }))],
    };
  }

  // Three pictured steps; hidden until the contract has all four keys. On its own screen the bar
  // already carries the title, so the section heading is left out there.
  howItWorks(withHeading) {
    const title = this.optionalText('how_title');
    const steps = HOW_STEPS.map(([key, art]) => [this.optionalText(key), art]);
    if (!title || steps.some(([text]) => !text)) return null;
    return h('section', { class: 'how', 'aria-label': withHeading ? null : title, 'aria-labelledby': withHeading ? 'how-title' : null },
      withHeading ? h('h2', { class: 'how-title', id: 'how-title', text: title }) : null,
      h('ol', { class: 'how-steps' }, steps.map(([text, art]) => h('li', { class: 'how-step' },
        h('span', { class: 'how-art' }, icon(art)),
        h('p', { class: 'how-text', text })))));
  }

  howScreen() {
    const section = this.howItWorks(false);
    if (!section) return { redirect: routeHash('settings') };
    return { title: this.t('how_title'), back: { href: routeHash('settings'), label: this.t('title_settings') }, body: [section] };
  }

  giveConsent() {
    this.consent = true;
    this.persist();
    this.render();
  }

  screenFor(route) {
    switch (route.view) {
      case 'check':
        return this.checkScreen(route.param);
      case 'result':
        return this.resultScreen(route.param);
      case 'settings':
        return this.settingsScreen();
      case 'evidence':
        return this.evidenceScreen(route.param);
      case 'how':
        return this.howScreen();
      default:
        return this.batchesScreen();
    }
  }

  renderBar(screen) {
    const title = h('h1', { class: 'bar-title', text: screen.title });
    // The welcome screen carries the mark and the name itself, so it has no bar.
    if (screen.bare) return [];
    // The house is in the same corner on every screen and always leads to the batch list.
    const homeLabel = this.optionalText('nav_home');
    const home = homeLabel
      ? h('a', { class: 'icon-button home', href: routeHash('batches'), 'aria-label': homeLabel, 'aria-current': screen.back ? null : 'page' }, icon('home'))
      : null;
    if (!screen.back) {
      const settings = h('a', { class: 'icon-button', href: routeHash('settings'), 'aria-label': this.t('title_settings') },
        icon('settings'));
      return [h('span', { class: 'bar-mark' }, icon('sankofa')), title, home, settings].filter(Boolean);
    }
    const back = h('a', { class: 'icon-button', href: screen.back.href, 'aria-label': screen.back.label }, icon('back'));
    return [back, title, home].filter(Boolean);
  }

  backToBatches() {
    return { href: routeHash('batches'), label: this.t('title_batches') };
  }

  batchesScreen() {
    const labelOrder = batchLabels(this.contract);
    const batches = labelOrder.filter(label => this.batches.has(label)).map(label => this.batches.get(label));
    const labels = batches.map(batch => batch.label);
    batches.sort((a, b) => bandRank(this.contract, a.result ? a.result.band : null) - bandRank(this.contract, b.result ? b.result.band : null)
      || labelOrder.indexOf(a.label) - labelOrder.indexOf(b.label));
    const count = batches.filter(batch => needsCheck(this.contract, batch)).length;
    const summary = this.optionalText('summary_line', { count: this.formatNumber(count), total: this.formatNumber(batches.length) });
    const list = h('ul', { class: 'batches' }, batches.map(batch => this.batchRow(batch)));
    const free = freeBatchLabels(this.contract, this.batches.keys());
    const add = free.length > 0
      ? h('a', { class: 'button button-primary', href: routeHash('check') }, icon('plus'), h('span', { text: this.t('button_add_batch') }))
      : h('button', { class: 'button button-primary', type: 'button', disabled: true },
        icon('plus'), h('span', { text: this.t('button_add_batch') }));
    return {
      title: this.t('title_batches'),
      body: labels.length > 0
        ? [summary ? h('p', { class: `summary${count > 0 ? ' needs-check' : ''}` }, icon(count > 0 ? 'alert' : 'check'), h('span', { text: summary })) : null, list].filter(Boolean)
        : [this.emptyBatches()],
      dock: [add],
    };
  }

  // An empty list invites the two ways in: Add batch in the dock, and the demo batches here.
  emptyBatches() {
    const demoLabel = this.optionalText('button_load_demo');
    const offerDemo = demoLabel && this.optionalText('demo_data_note') && this.demoAnswers.length > 0;
    return h('div', { class: 'empty' },
      icon('sack', 'empty-mark'),
      offerDemo
        ? h('button', { class: 'button button-secondary', type: 'button', onclick: () => this.loadDemoBatches() }, icon('demo'), h('span', { text: demoLabel }))
        : null);
  }

  batchRow(batch) {
    const band = batch.result ? batch.result.band : null;
    const messageKey = band ? bandMessage(this.contract, band) : null;
    const href = batch.result ? routeHash('result', batch.label) : routeHash('check', batch.label);
    return h('li', {},
      h('a', { class: `batch ${band ? `edge-${band}` : 'batch-unchecked'}`, href },
        h('span', { class: `mini-stamp ${band ? `band-${band}` : 'is-pending'}` }, icon(band ? `band-${band}` : 'pending')),
        h('span', { class: 'batch-text' },
          h('span', { class: 'batch-label', text: batch.label }),
          messageKey ? h('span', { class: 'batch-band', text: this.t(messageKey) }) : null,
          h('time', { class: 'batch-date', datetime: batch.checkedAt, text: this.formatDate(batch.checkedAt) })),
        this.demoDataTag(batch)));
  }

  demoDataTag(batch) {
    const text = batch.demoData ? this.optionalText('demo_data_note') : null;
    return text ? h('span', { class: 'batch-demo', text }) : null;
  }

  checkScreen(label) {
    const labels = batchLabels(this.contract);
    if (label !== null && !labels.includes(label)) return { redirect: routeHash('batches') };
    const existing = label === null ? null : this.batches.get(label) ?? null;
    if (label === null && freeBatchLabels(this.contract, this.batches.keys()).length === 0) {
      return { redirect: routeHash('batches') };
    }
    // Answers live here for as long as the form is open, so going back a step never loses one.
    const key = label ?? '';
    if (!this.wizard || this.wizard.key !== key) {
      const answers = existing ? keepValidAnswers(this.contract, existing.answers) : {};
      if (label !== null) answers[BATCH_LABEL_INPUT] = label;
      this.wizard = { key, answers, fixedLabel: label, step: 0 };
    }
    const draft = this.wizard;
    const back = existing && existing.result
      ? { href: routeHash('result', label), label: this.t('title_result') }
      : this.backToBatches();
    const backLabel = this.optionalText('button_back');
    return backLabel ? this.stepScreen(draft, back, backLabel) : this.wholeForm(draft, back);
  }

  // One question per screen; a re-check skips the batch label, which is already known.
  stepScreen(draft, back, backLabel) {
    const steps = askedInputs(this.contract).filter(input => !(input.name === BATCH_LABEL_INPUT && draft.fixedLabel !== null));
    draft.step = Math.min(Math.max(draft.step, 0), steps.length - 1);
    const input = steps[draft.step];
    const last = draft.step === steps.length - 1;
    const form = h('form', { class: 'check wizard', id: 'check-form', novalidate: true },
      this.stepMarkers(steps, draft),
      this.playButton([`question_${input.name}`]),
      this.question(input, draft));
    form.addEventListener('submit', event => {
      event.preventDefault();
      this.nextStep(form, steps, input);
    });
    const focusQuestion = ['.question input:checked', '.question input:not([disabled])'];
    const previous = draft.step > 0
      ? h('button', {
        class: 'button button-secondary', type: 'button',
        onclick: () => {
          this.stopAudio();
          draft.step -= 1;
          this.transition(() => this.render(focusQuestion));
        },
      }, icon('back'), h('span', { text: backLabel }))
      : null;
    const next = h('button', { class: 'button button-primary', type: 'submit', form: 'check-form' },
      icon(last ? 'check' : 'action'), h('span', { text: this.t(last ? 'button_check' : 'button_continue') }));
    return { title: this.t('title_check'), back, body: [form], dock: [h('div', { class: 'dock-row' }, previous, next)] };
  }

  // A sequence, so numbered markers: done ones show a tick, the current one is filled.
  stepMarkers(steps, draft) {
    return h('ol', { class: 'markers' }, steps.map((input, index) => {
      const current = index === draft.step;
      const done = !current && isValidAnswer(input, draft.answers[input.name], this.contract.dont_know_value);
      return h('li', {
        class: `marker${current ? ' is-current' : ''}${done ? ' is-done' : ''}`,
        'aria-current': current ? 'step' : null,
        'aria-label': this.t(`question_${input.name}`),
      }, done ? icon('check') : h('span', { text: this.formatNumber(index + 1) }));
    }));
  }

  nextStep(form, steps, input) {
    const draft = this.wizard;
    if (!isValidAnswer(input, draft.answers[input.name], this.contract.dont_know_value)) {
      const fieldset = form.querySelector('fieldset');
      setMissing(fieldset, true);
      const control = fieldset.querySelector('input:not([disabled])');
      if (control) control.focus();
      return;
    }
    if (draft.step < steps.length - 1) {
      this.stopAudio();
      draft.step += 1;
      this.transition(() => this.render(['.question input:checked', '.question input:not([disabled])']));
      return;
    }
    const missing = steps.findIndex(step => !isValidAnswer(step, draft.answers[step.name], this.contract.dont_know_value));
    if (missing !== -1) {
      draft.step = missing;
      this.render(['.question input:checked', '.question input:not([disabled])']);
      return;
    }
    this.saveCheck(withComputedDays(this.contract, draft.answers, localDateString(new Date())));
  }

  // The single-page form, used until the contract has button_back.
  wholeForm(draft, back) {
    const form = h('form', { class: 'check', id: 'check-form', novalidate: true });
    for (const input of askedInputs(this.contract)) form.append(this.question(input, draft));
    form.addEventListener('submit', event => {
      event.preventDefault();
      this.submitCheck(form, draft);
    });
    return {
      title: this.t('title_check'),
      back,
      body: [form],
      dock: [h('button', { class: 'button button-primary', type: 'submit', form: 'check-form' },
        icon('check'), h('span', { text: this.t('button_check') }))],
    };
  }

  question(input, draft) {
    const legendId = `q-${input.name}`;
    const art = Object.hasOwn(QUESTION_ART, input.name) ? icon(QUESTION_ART[input.name], 'question-art') : null;
    const fieldset = h('fieldset', { class: `question question-${input.type}`, 'data-name': input.name },
      h('legend', { id: legendId },
        art,
        icon('alert', 'missing-mark'),
        h('span', { text: this.t(`question_${input.name}`) })));
    const markAnswered = () => {
      if (isValidAnswer(input, draft.answers[input.name], this.contract.dont_know_value)) setMissing(fieldset, false);
    };
    if (input.type === 'choice') fieldset.append(this.choiceOptions(input, draft, markAnswered));
    else if (input.type === 'integer') fieldset.append(...this.integerControl(input, draft, legendId, markAnswered));
    else if (input.type === 'date') fieldset.append(...this.dateControl(input, draft, legendId, markAnswered));
    else throw new Error(`input ${input.name} has unsupported type ${input.type}`);
    return fieldset;
  }

  optionTile({ type, name, value, checked, text, extraClass = '', onchange, art = null }) {
    return h('label', { class: `option ${extraClass}`.trim() },
      h('input', { type, name, value, checked, onchange }),
      h('span', { class: 'option-face' }, art ? icon(art, 'option-art') : null, icon('check', 'option-tick'), h('span', { text })));
  }

  choiceOptions(input, draft, markAnswered) {
    const isLabel = input.name === BATCH_LABEL_INPUT;
    let values = input.values;
    if (isLabel) {
      values = draft.fixedLabel !== null ? [draft.fixedLabel] : freeBatchLabels(this.contract, this.batches.keys());
    }
    const choices = values.map(value => ({ value, text: isLabel ? value : this.t(`option_${value}`) }));
    if (input.allows_dont_know) choices.push({ value: this.contract.dont_know_value, text: this.t('option_dont_know'), dontKnow: true });
    const onchange = event => {
      draft.answers[input.name] = event.target.value;
      markAnswered();
    };
    return h('div', { class: `options${isLabel ? ' options-labels' : ''}` }, choices.map(choice => this.optionTile({
      type: 'radio',
      name: `answer-${input.name}`,
      value: choice.value,
      checked: draft.answers[input.name] === choice.value,
      text: choice.text,
      extraClass: choice.dontKnow ? 'option-dont-know' : '',
      art: Object.hasOwn(OPTION_ICONS, choice.value) ? OPTION_ICONS[choice.value] : null,
      onchange,
    })));
  }

  dontKnowToggle(input, draft, onToggle) {
    return this.optionTile({
      type: 'checkbox',
      name: `dont-know-${input.name}`,
      value: this.contract.dont_know_value,
      checked: draft.answers[input.name] === this.contract.dont_know_value,
      text: this.t('option_dont_know'),
      extraClass: 'option-dont-know',
      art: OPTION_ICONS.dont_know,
      onchange: event => onToggle(event.target.checked),
    });
  }

  integerControl(input, draft, legendId, markAnswered) {
    const dontKnow = this.contract.dont_know_value;
    const count = h('span', { class: 'count', 'aria-hidden': 'true' });
    const slider = h('input', {
      type: 'range', class: 'slider', min: input.min, max: input.max, step: 1, value: input.min,
      'aria-labelledby': legendId,
    });
    let toggle = null;
    const sync = () => {
      const value = draft.answers[input.name];
      const isNumber = Number.isInteger(value);
      count.textContent = isNumber ? this.formatNumber(value) : '';
      if (isNumber) slider.value = String(value);
      slider.dataset.state = isNumber ? 'set' : 'unset';
      if (toggle) toggle.querySelector('input').checked = value === dontKnow;
      markAnswered();
    };
    const setNumber = value => {
      draft.answers[input.name] = Math.min(input.max, Math.max(input.min, value));
      sync();
    };
    const step = delta => {
      const current = draft.answers[input.name];
      setNumber(Number.isInteger(current) ? current + delta : input.min);
    };
    slider.addEventListener('input', () => setNumber(Number(slider.value)));
    // The slider is the accessible control; the step buttons are a larger touch shortcut for it.
    const stepper = h('div', { class: 'stepper' },
      h('button', { type: 'button', class: 'step', tabindex: '-1', 'aria-hidden': 'true', onclick: () => step(-1) }, icon('minus')),
      count,
      h('button', { type: 'button', class: 'step', tabindex: '-1', 'aria-hidden': 'true', onclick: () => step(1) }, icon('plus')));
    const controls = [stepper, slider];
    if (input.allows_dont_know) {
      toggle = this.dontKnowToggle(input, draft, checked => {
        if (checked) draft.answers[input.name] = dontKnow;
        else delete draft.answers[input.name];
        sync();
      });
      controls.push(h('div', { class: 'options' }, toggle));
    }
    sync();
    return controls;
  }

  dateControl(input, draft, legendId, markAnswered) {
    const dontKnow = this.contract.dont_know_value;
    const current = draft.answers[input.name];
    const today = localDateString(new Date());
    const errorId = `${input.name}-error`;
    // max stops future dates in most pickers, but iOS Safari ignores it, so the date is checked here too.
    const field = h('input', {
      type: 'date', class: 'date', max: today, 'aria-labelledby': legendId,
      value: isCalendarDate(current) ? current : null,
    });
    const error = h('p', { class: 'field-error', id: errorId, role: 'status' });
    const showFuture = future => {
      const text = future ? this.optionalText('error_future_date') : null;
      error.replaceChildren(...(future ? [icon('alert'), text ? h('span', { text }) : null].filter(Boolean) : []));
      if (future) {
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', errorId);
      } else {
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
      }
      // Continue stays off while the date is in the future.
      for (const next of document.querySelectorAll('#dock button[type="submit"]')) next.disabled = future;
    };
    let toggle = null;
    const onPick = () => {
      const future = isCalendarDate(field.value) && isFutureDate(field.value, today);
      if (isCalendarDate(field.value) && !future) draft.answers[input.name] = field.value;
      else delete draft.answers[input.name];
      if (toggle) toggle.querySelector('input').checked = false;
      showFuture(future);
      markAnswered();
    };
    // Mobile pickers differ on which of the two events they fire, so both are handled.
    field.addEventListener('input', onPick);
    field.addEventListener('change', onPick);
    const controls = [field];
    if (input.allows_dont_know) {
      toggle = this.dontKnowToggle(input, draft, checked => {
        if (checked) {
          draft.answers[input.name] = dontKnow;
          field.value = '';
        } else {
          delete draft.answers[input.name];
        }
        showFuture(false);
        markAnswered();
      });
      controls.push(error, h('div', { class: 'options' }, toggle));
    } else {
      controls.push(error);
    }
    return controls;
  }

  submitCheck(form, draft) {
    let first = null;
    for (const input of askedInputs(this.contract)) {
      const fieldset = form.querySelector(`fieldset[data-name="${input.name}"]`);
      const answered = isValidAnswer(input, draft.answers[input.name], this.contract.dont_know_value);
      setMissing(fieldset, !answered);
      if (!answered) first ??= fieldset;
    }
    if (first) {
      first.scrollIntoView({ block: 'start' });
      const control = first.querySelector('input:not([disabled])');
      if (control) control.focus({ preventScroll: true });
      return;
    }
    this.saveCheck(withComputedDays(this.contract, draft.answers, localDateString(new Date())));
  }

  saveCheck(draftAnswers) {
    const label = draftAnswers[BATCH_LABEL_INPUT];
    const previous = this.batches.get(label);
    const answers = { ...draftAnswers };
    const result = this.runCheck(answers);
    // A check the farmer submits is their own, so it is no longer demo data even on a demo batch's label.
    this.batches.set(label, { label, answers, checkedAt: new Date().toISOString(), result, actions: previous ? previous.actions : [], demoData: false });
    this.persist();
    this.wizard = null;
    this.go(result ? routeHash('result', label) : routeHash('batches'));
  }

  resultScreen(label) {
    const batch = label === null ? null : this.batches.get(label);
    if (!batch) return { redirect: routeHash('batches') };
    if (!batch.result) return { redirect: routeHash('check', label) };
    const { band, reasons } = batch.result;
    const messageKey = bandMessage(this.contract, band);
    if (!messageKey) return { redirect: routeHash('check', label) };
    const shownReasons = reasons.slice(0, 2);
    const action = pickAction(this.contract, band, shownReasons);
    const spoken = [messageKey, ...shownReasons, ...(action ? [action] : [])];
    const body = [
      this.playButton(spoken),
      h('section', { class: 'result-card' },
        h('div', { class: `band band-${band}` },
          h('div', { class: 'stamp' },
            icon(`band-${band}`, 'band-icon'),
            h('p', { class: 'band-text', text: this.t(messageKey) }))),
        h('p', { class: 'result-card-head' },
          icon('sack'),
          h('span', { class: 'result-label', text: batch.label }),
          h('time', { datetime: batch.checkedAt, text: this.formatDate(batch.checkedAt) }))),
    ];
    const demoData = batch.demoData ? this.optionalText('demo_data_note') : null;
    if (demoData) body.push(h('p', { class: 'demo-note', text: demoData }));
    if (batch.result.demo) body.push(h('p', { class: 'demo-note', text: this.t('demo_model_note') }));
    if (shownReasons.length > 0) {
      body.push(h('ul', { class: 'why' }, shownReasons.map(reason => h('li', {}, icon(reasonIcon(reason)), h('span', { text: this.t(reason) })))));
    }
    if (action) {
      body.push(h('p', { class: 'action' },
        h('span', { class: 'action-art' }, icon(Object.hasOwn(ACTION_ART, action) ? ACTION_ART[action] : 'action')),
        h('span', { text: this.t(action) })));
    }
    if (Number.isInteger(batch.result.weatherYear)) body.push(this.weatherRow(batch));
    body.push(h('p', { class: 'synthetic' },
      h('span', { text: this.t('synthetic_label') }),
      h('a', { class: 'synthetic-link', href: routeHash('evidence', batch.label) }, icon('evidence'), h('span', { text: this.t('title_evidence') }))));
    if (offersSms(this.contract, band)) body.push(this.smsSection(batch));
    body.push(this.recordSection(batch));
    return {
      title: this.t('title_result'),
      back: this.backToBatches(),
      body,
      dock: [h('a', { class: 'button button-secondary', href: routeHash('check', batch.label) },
        icon('reload'), h('span', { text: this.t('button_check') }))],
    };
  }

  // Large, first on the screen, and only when this language has a clip for at least one of the keys.
  playButton(keys) {
    const playable = audioKeys(this.contract, this.audioIndex, this.language.code);
    if (!keys.some(key => playable.has(key))) return null;
    return h('button', { class: 'button button-primary play', type: 'button', onclick: () => this.playAudio(keys, playable) },
      icon('play'), h('span', { text: this.t('button_play') }));
  }

  // The window read without reading: one picture per day, a sun at or below the damp-air mark and a
  // drop above it, in two rows of seven. The exact line is on About this check. Shown only when
  // weather_days can give it a text alternative; the note always shows.
  weatherRow(batch) {
    const note = h('p', { class: 'weather-note', text: this.t('weather_note', { year: batch.result.weatherYear }) });
    const days = weatherDays(humiditySeries(this.contract, batch.answers, this.model.weather));
    const wet = days ? days.filter(day => day === 'damp').length : null;
    const label = days ? this.optionalText('weather_days', { wet: this.formatNumber(wet) }) : null;
    if (!label) return note;
    return h('figure', { class: 'weather-days' },
      h('div', { class: 'day-grid', role: 'img', 'aria-label': label },
        days.map(day => h('span', { class: `day day-${day}` }, icon(day === 'damp' ? 'humid' : 'sun')))),
      h('figcaption', {}, note));
  }

  // The 14 daily humidity values as a small line with the 80 percent mark from the OTA literature
  // (spec 7), on About this check. Drawn only when weather_strip can give it a text alternative.
  humidityStrip(batch) {
    const note = h('p', { class: 'weather-note', text: this.t('weather_note', { year: batch.result.weatherYear }) });
    const values = humiditySeries(this.contract, batch.answers, this.model.weather);
    const label = values
      ? this.optionalText('weather_strip', { low: this.formatShare(Math.min(...values) / 100), high: this.formatShare(Math.max(...values) / 100) })
      : null;
    if (!label) return note;
    // 50 to 100 percent covers the bundled year's daily means (about 54 to 91) with room to read the shape.
    const [width, height, low, high, mark] = [300, 64, 50, 100, DAMP_AIR_PERCENT];
    const points = sparklinePoints(values, { width, height, low, high });
    const markY = sparklinePoints([mark], { width, height, low, high })[0][1];
    const [lastX, lastY] = points[points.length - 1];
    // The "80%" label sits in its own space past the line's right end, so the line never runs through it.
    const labelSpace = 40;
    const chart = svg('svg', { viewBox: `-4 -4 ${width + labelSpace + 8} ${height + 8}`, role: 'img', 'aria-label': label, class: 'humidity-chart' });
    chart.append(
      svg('line', { x1: 0, x2: width + 4, y1: markY, y2: markY, class: 'humidity-mark' }),
      svg('polyline', { points: points.map(point => point.join(',')).join(' '), class: 'humidity-line' }),
      svg('circle', { cx: lastX, cy: lastY, r: 4, class: 'humidity-end' }));
    const markLabel = svg('text', { x: width + 10, y: markY + 4, class: 'humidity-mark-label' });
    markLabel.textContent = this.formatShare(mark / 100);
    chart.append(markLabel);
    return h('figure', { class: 'humidity' }, chart, h('figcaption', {}, note));
  }

  // A draft only: the app never sends it (spec 2). Copying falls back to selecting the text.
  smsSection(batch) {
    const text = this.t('sms_template', { batch_label: batch.label });
    const draft = h('textarea', { class: 'sms-text', readonly: true, rows: 4, 'aria-labelledby': 'sms-label' });
    draft.value = text;
    const label = h('span', { text: this.t('button_copy_sms') });
    const copy = h('button', { class: 'button button-primary sms-copy', type: 'button' },
      icon('copy', 'when-ready'), icon('check', 'when-copied'), label);
    // Present before anything is copied, so a screen reader is already listening when it changes.
    const announcement = h('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
    copy.addEventListener('click', () => this.copySms(text, { button: copy, label, announcement, draft }));
    return h('section', { class: 'sms' },
      h('p', { class: 'sms-label', id: 'sms-label' }, icon('message'), h('span', { text: this.t('sms_not_sent') })),
      draft,
      copy,
      announcement);
  }

  async copySms(text, { button, label, announcement, draft }) {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      const copied = this.t('sms_copied');
      button.classList.add('copied');
      label.textContent = copied;
      announcement.textContent = copied;
      setTimeout(() => {
        button.classList.remove('copied');
        label.textContent = this.t('button_copy_sms');
        announcement.textContent = '';
      }, SECONDS_TO_SHOW_COPIED * 1000);
    } catch {
      draft.focus();
      draft.select();
    }
  }

  playAudio(keys, playable) {
    this.stopAudio();
    const queue = keys.filter(key => playable.has(key)).map(key => `audio/${this.language.code}/${key}.mp3`);
    const playNext = () => {
      const url = queue.shift();
      if (!url) {
        this.player = null;
        return;
      }
      const player = new Audio(url);
      this.player = player;
      player.addEventListener('ended', playNext);
      player.play().catch(error => {
        console.error(error);
        if (this.player === player) this.player = null;
      });
    };
    playNext();
  }

  stopAudio() {
    if (!this.player) return;
    this.player.pause();
    this.player = null;
  }

  // Recording what was done never touches batch.result (spec 3, step 5).
  recordSection(batch) {
    const toggle = h('button', {
      type: 'button', class: 'button button-secondary record-toggle', 'aria-expanded': String(this.recordOpen),
      onclick: () => {
        this.recordOpen = !this.recordOpen;
        this.render(this.recordOpen ? '.record-choice' : '.record-toggle');
      },
    }, icon('record'), h('span', { text: this.t('button_record_action') }));
    const choices = this.recordOpen
      ? h('div', { class: 'options record-options' }, this.contract.recorded_actions.map(action => h('button', {
        type: 'button', class: 'record-choice', onclick: () => this.recordAction(batch.label, action),
      }, h('span', { text: this.t(`record_${action}`) }))))
      : null;
    const history = batch.actions.length > 0
      ? h('ul', { class: 'records' }, [...batch.actions].reverse().map(entry => h('li', {},
        icon('check'),
        h('span', { class: 'records-action', text: this.t(`record_${entry.action}`) }),
        h('time', { datetime: entry.at, text: this.formatDate(entry.at) }))))
      : null;
    return h('section', { class: 'record' }, toggle, choices, history);
  }

  recordAction(label, action) {
    const batch = this.batches.get(label);
    if (!batch || !this.contract.recorded_actions.includes(action)) return;
    batch.actions = [...batch.actions, { action, at: new Date().toISOString() }];
    this.recordOpen = false;
    this.persist();
    this.render('.record-toggle');
  }

  // On the welcome screen the two languages are two big tiles, each named in its own language.
  languageTiles() {
    return h('div', { class: 'options welcome-languages' }, this.languages.map(language => this.optionTile({
      type: 'radio',
      name: 'language',
      value: language.code,
      checked: language.code === this.language.code,
      text: language.messages.language_name,
      art: 'language',
      onchange: () => this.chooseLanguage(language.code),
    })));
  }

  languageChoices() {
    return h('section', { class: 'setting' }, h('div', { class: 'setting-mark' }, icon('language')),
      h('div', { class: 'options options-languages' }, this.languages.map(language => this.optionTile({
        type: 'radio',
        name: 'language',
        value: language.code,
        checked: language.code === this.language.code,
        text: language.messages.language_name,
        onchange: () => this.chooseLanguage(language.code),
      }))));
  }

  settingsScreen() {
    const evidence = h('section', { class: 'setting' }, h('div', { class: 'setting-mark' }, icon('evidence')),
      h('a', { class: 'button button-secondary', href: routeHash('evidence') }, h('span', { text: this.t('title_evidence') })));
    const howTitle = this.optionalText('how_title');
    const how = howTitle && this.howItWorks(false)
      ? h('section', { class: 'setting' }, h('div', { class: 'setting-mark' }, icon('sankofa')),
        h('a', { class: 'button button-secondary', href: routeHash('how') }, h('span', { text: howTitle })))
      : null;
    const loadDemo = this.demoSetting();
    const deleteAll = h('section', { class: 'setting' }, h('div', { class: 'setting-mark' }, icon('trash')),
      h('button', { class: 'button button-danger', type: 'button', onclick: () => this.deleteAll() },
        h('span', { text: this.t('button_delete_all') })));
    return {
      title: this.t('title_settings'),
      back: this.backToBatches(),
      body: [this.languageChoices(), how, evidence, loadDemo, deleteAll].filter(Boolean),
    };
  }

  // Shown only once the contract has the button and label keys, and only with demo batches to load.
  demoSetting() {
    const label = this.optionalText('button_load_demo');
    if (!label || !this.optionalText('demo_data_note') || this.demoAnswers.length === 0) return null;
    const realLabels = [...this.batches.values()].filter(batch => !batch.demoData).map(batch => batch.label);
    const fits = placeDemoBatches(this.contract, this.demoAnswers, realLabels) !== null;
    return h('section', { class: 'setting' }, h('div', { class: 'setting-mark' }, icon('demo')),
      h('button', { class: 'button button-secondary', type: 'button', disabled: !fits, onclick: () => this.loadDemoBatches() },
        h('span', { text: label })));
  }

  // Loading again replaces the earlier demo batches instead of adding a second set.
  loadDemoBatches() {
    for (const batch of [...this.batches.values()]) {
      if (batch.demoData) this.batches.delete(batch.label);
    }
    const placed = placeDemoBatches(this.contract, this.demoAnswers, this.batches.keys());
    if (!placed) return;
    const checkedAt = new Date().toISOString();
    for (const { label, answers } of placed) {
      this.batches.set(label, { label, answers, checkedAt, result: this.runCheck(answers), actions: [], demoData: true });
    }
    this.persist();
    this.go(routeHash('batches'));
  }

  // The offline cache holds every app file, audio included, so its sizes are the app's size on the phone.
  async cachedFileSizes(base) {
    if (!('caches' in window)) return null;
    try {
      const names = (await caches.keys()).filter(name => name.startsWith(CACHE_PREFIX));
      // None yet, or an update is replacing the old version: use the files this page loaded instead.
      if (names.length !== 1) return null;
      const cache = await caches.open(names[0]);
      const sizes = await Promise.all((await cache.keys()).map(async request => {
        const response = await cache.match(request);
        return [request.url.slice(base.length), response ? (await response.arrayBuffer()).byteLength : 0];
      }));
      return sizes.sort(([a], [b]) => a.localeCompare(b));
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // Without the offline cache, resource timing names the files this page loaded. Its sizes read 0 for
  // memory-cache hits and count 404 bodies, so each file is measured from a cached copy instead.
  async measureAppFiles() {
    const base = new URL('.', location.href).href;
    const cached = await this.cachedFileSizes(base);
    if (cached) return cached;
    const names = new Set();
    for (const entry of [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')]) {
      const url = new URL(entry.name, location.href);
      url.search = '';
      url.hash = '';
      if (url.href.startsWith(base)) names.add(url.href.slice(base.length) || 'index.html');
    }
    const measured = await Promise.all([...names].map(async name => {
      try {
        const response = await fetch(name, { cache: 'force-cache' });
        return response.ok ? [name, (await response.arrayBuffer()).byteLength] : null;
      } catch {
        return null;
      }
    }));
    return measured.filter(Boolean).sort(([a], [b]) => a.localeCompare(b));
  }

  fillFileSizes(totalElement, listElement) {
    this.measureAppFiles().then(files => {
      if (!totalElement.isConnected) return;
      const total = files.reduce((sum, [, bytes]) => sum + bytes, 0);
      totalElement.textContent = total > 0 ? this.formatBytes(total) : this.t('not_evaluated');
      totalElement.removeAttribute('aria-busy');
      listElement.replaceChildren(...files.map(([name, bytes]) => h('li', {}, h('span', { text: name }), h('span', { text: this.formatBytes(bytes) }))));
    });
  }

  evidenceScreen(label) {
    const { tree } = this.model;
    const batch = label === null ? null : this.batches.get(label) ?? null;
    const notEvaluated = this.t('not_evaluated');
    const fact = (labelKey, value, className = '') => [
      h('dt', { text: this.t(labelKey) }),
      h('dd', { class: className, text: value ?? notEvaluated }),
    ];
    const sizesTotal = h('dd', { 'aria-busy': 'true' });
    const fileList = h('ul', { class: 'file-sizes' });
    const facts = h('dl', { class: 'facts' },
      fact('evidence_model_version', tree ? tree.model_version : null),
      fact('evidence_tree_hash', tree ? tree.sha256 : null, 'hash'),
      h('dt', { text: this.t('evidence_file_sizes') }), sizesTotal);
    this.fillFileSizes(sizesTotal, fileList);
    const cell = (column, name) => {
      const value = metricCell(this.metrics, column, name, tree ? tree.sha256 : null);
      return h('td', { class: value === null ? 'not-evaluated' : '', text: value === null ? notEvaluated : this.formatShare(value) });
    };
    const metrics = h('table', { class: 'metrics' },
      h('thead', {}, h('tr', {}, h('td', {}), h('th', { scope: 'col', text: this.t('evidence_tree') }), h('th', { scope: 'col', text: this.t('evidence_baseline') }))),
      h('tbody', {}, this.contract.metrics.map(name => h('tr', {},
        h('th', { scope: 'row', text: this.t(`metric_${name}`) }), cell('tree', name), cell('baseline', name)))));
    const sources = [h('li', { text: this.t('source_labels') })];
    if (Number.isInteger(this.model.weatherYear)) sources.unshift(h('li', { text: this.t('source_weather', { year: this.model.weatherYear }) }));
    // For farmers: what the check does, that it can be wrong, and that records stay on the phone.
    const body = [h('p', { class: 'synthetic', text: this.t('synthetic_label') })];
    if (this.model.demo) body.push(h('p', { class: 'demo-note', text: this.t('demo_model_note') }));
    body.push(this.howItWorks(true));
    const canBeWrong = this.optionalText('about_can_be_wrong');
    if (canBeWrong) body.push(h('p', { class: 'about-line', text: canBeWrong }));
    body.push(h('p', { class: 'about-line', text: this.t('consent_text') }));
    // For reviewers, closed by default: every number, name and hash a farmer has no use for. Opened
    // from a result, it starts with that batch's exact humidity line.
    const technical = [];
    if (batch && batch.result && Number.isInteger(batch.result.weatherYear)) {
      technical.push(h('section', { class: 'evidence-weather' },
        h('h3', { class: 'section-title', text: batch.label }),
        this.humidityStrip(batch)));
    }
    technical.push(facts, fileList,
      h('h3', { class: 'section-title', text: this.t('evidence_metrics') }), metrics,
      h('h3', { class: 'section-title', text: this.t('evidence_sources') }), h('ul', { class: 'sources' }, sources));
    const technicalTitle = this.optionalText('about_technical');
    if (technicalTitle) {
      body.push(h('details', { class: 'technical' },
        h('summary', {}, h('span', { text: technicalTitle }), icon('expand', 'technical-mark')),
        ...technical));
    } else {
      body.push(...technical);
    }
    const back = batch && batch.result ? { href: routeHash('result', batch.label), label: this.t('title_result') } : this.backToBatches();
    return { title: this.t('title_evidence'), back, body };
  }

  chooseLanguage(code) {
    const language = this.languages.find(candidate => candidate.code === code);
    if (!language || language === this.language) return;
    this.language = language;
    this.chosenLanguage = code;
    this.persist();
    this.render(`input[name="language"][value="${code}"]`);
  }

  // Delete-all returns the app to its first-run state, consent included (AC11: delete clears everything).
  deleteAll() {
    if (!window.confirm(this.t('confirm_delete_all'))) return;
    const cleared = this.store.clear();
    this.storageWorks = this.store.available && cleared;
    this.applyRecords(emptyRecords());
    history.replaceState(null, '', routeHash('batches'));
    this.render();
  }
}

// Without a messages file there is no approved text to show, so the failure screen is an icon
// and a reload button. The button's "Reload" label and the page title "SankofaFresh" are the two
// documented exceptions to the messages rule: docs/contracts_v2.md#messages.
const RELOAD_LABEL = 'Reload';
const APP_TITLE = 'SankofaFresh';

function renderFatal(error) {
  console.error(error);
  document.title = APP_TITLE;
  const main = document.getElementById('main');
  document.getElementById('bar').replaceChildren();
  const dock = document.getElementById('dock');
  dock.replaceChildren();
  dock.hidden = true;
  main.replaceChildren(h('div', { class: 'fatal' },
    icon('alert', 'fatal-mark'),
    h('button', {
      class: 'button button-secondary', type: 'button', 'aria-label': RELOAD_LABEL, lang: 'en', onclick: () => location.reload(),
    }, icon('reload'))));
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(error => console.error(error));
}

export async function boot() {
  registerServiceWorker();
  try {
    const contract = await fetchJson('contract.json');
    const problems = requireContract(contract);
    if (problems.length > 0) throw new Error(`contract.json: ${problems.join('; ')}`);
    const codes = languageCandidates(contract, document.documentElement.lang);
    const languages = await loadLanguages(contract, codes, url => fetchJson(url));
    if (languages.length === 0) throw new Error(`no complete messages file for ${codes.join(', ')}`);
    // Fixture previews never read or write the phone's real records.
    const fixtureMode = new URLSearchParams(location.search).has('fixtures');
    const store = new RecordStore(fixtureMode ? memoryStorage() : browserStorage());
    const [model, metrics, audioIndex, demoFile] = await Promise.all([
      loadModel(contract),
      loadOptionalJson('metrics.json'),
      loadOptionalJson('audio/index.json'),
      loadOptionalJson('demo_batches.json'),
    ]);
    const demoAnswers = demoBatchAnswers(contract, demoFile);
    const app = new App({ contract, languages, store, model, metrics, audioIndex, demoAnswers });
    if (fixtureMode) await app.loadFixtures();
    window.addEventListener('hashchange', () => app.transition(() => app.render()));
    if (!fixtureMode) {
      // Another open tab changed or deleted the records; show what is actually stored now.
      window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        app.applyRecords(store.read(contract));
        app.render();
      });
    }
    app.render();
  } catch (error) {
    renderFatal(error);
  }
}
