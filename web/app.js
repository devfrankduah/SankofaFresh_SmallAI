// SankofaFresh screens. Everything the farmer reads comes from messages.<lang>.json, and every
// question, option, band and rule comes from contract.json at runtime.

import { BATCH_LABEL_INPUT, RecordStore, STORAGE_KEY, browserStorage, emptyRecords, memoryStorage } from './storage.js';

const VIEWS = new Set(['batches', 'check', 'result', 'settings']);
const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/;
const SVG_NS = 'http://www.w3.org/2000/svg';
// Only reachable when the repository root is served; the deployed web/ folder has no tests/.
const FIXTURE_FILES = ['../tests/fixtures/demo_batches.json', '../tests/fixtures/out_of_range.json'];

export async function fetchJson(url, fetchImplementation = globalThis.fetch) {
  const response = await fetchImplementation(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
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

export function hasEveryMessage(contract, messages) {
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) return false;
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

export function localDateString(date) {
  const pad = number => String(number).padStart(2, '0');
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Until the result pipeline is wired (#13), fixture batches carry only the abstention outcome
// the fixtures already state; a batch the fixtures expect to reach the tree stays unchecked.
export function batchesFromFixtures(contract, fixtures, checkedAt) {
  const labels = new Set(batchLabels(contract));
  const batches = [];
  for (const fixture of fixtures) {
    for (const fixtureCase of Array.isArray(fixture?.cases) ? fixture.cases : []) {
      const label = fixtureCase?.inputs?.[BATCH_LABEL_INPUT];
      if (!labels.has(label)) continue;
      const reason = fixtureCase.expected?.abstain_reason ?? null;
      batches.push({
        label,
        answers: { ...fixtureCase.inputs },
        checkedAt,
        result: reason ? { band: contract.abstention.band, reasons: [reason] } : null,
        actions: [],
      });
    }
  }
  return batches;
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

class App {
  constructor({ contract, languages, store }) {
    this.contract = contract;
    this.languages = languages;
    this.store = store;
    this.storageWorks = store.available;
    this.previousView = null;
    this.recordOpen = false;
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
  optionalText(key) {
    return this.contract.message_keys.includes(key) ? this.t(key) : null;
  }

  formatNumber(value) {
    try {
      return new Intl.NumberFormat(this.language.code).format(value);
    } catch {
      return String(value);
    }
  }

  formatDate(isoTimestamp) {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(this.language.code, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    } catch {
      return localDateString(date);
    }
  }

  async loadFixtures() {
    const fixtures = await Promise.all(FIXTURE_FILES.map(file => fetchJson(file)));
    for (const batch of batchesFromFixtures(this.contract, fixtures, new Date().toISOString())) {
      this.batches.set(batch.label, batch);
    }
  }

  render(focusSelector = null) {
    const route = parseRoute(location.hash);
    const screen = this.consent ? this.screenFor(route) : this.consentScreen();
    if (screen.redirect) {
      location.replace(screen.redirect);
      return;
    }
    document.documentElement.lang = this.language.code;
    document.title = screen.title;
    this.bar.replaceChildren(...this.renderBar(screen));
    this.main.replaceChildren(...this.storageNotice(), ...screen.body);
    this.dock.replaceChildren(...(screen.dock ?? []));
    this.dock.hidden = !screen.dock || screen.dock.length === 0;
    const routeKey = this.consent ? `${route.view}/${route.param ?? ''}` : 'consent';
    if (this.previousView !== routeKey) {
      if (this.previousView !== null) window.scrollTo(0, 0);
      this.recordOpen = false;
    }
    const target = focusSelector ? document.querySelector(focusSelector) : null;
    if (target) target.focus();
    else if (this.previousView !== null && this.previousView !== routeKey) this.main.focus({ preventScroll: true });
    this.previousView = routeKey;
  }

  storageNotice() {
    if (this.storageWorks) return [];
    const text = this.optionalText('error_storage');
    return [h('p', { class: 'storage-notice', role: 'status' }, icon('alert'), text ? h('span', { text }) : null)];
  }

  consentScreen() {
    const body = [h('section', { class: 'consent' },
      icon('sack', 'consent-mark'),
      h('p', { class: 'consent-text', text: this.t('consent_text') }))];
    if (this.languages.length > 1) body.push(this.languageChoices());
    return {
      title: this.t('title_consent'),
      bare: true,
      body,
      dock: [h('button', { class: 'button button-primary', type: 'button', onclick: () => this.giveConsent() },
        icon('check'), h('span', { text: this.t('button_continue') }))],
    };
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
      default:
        return this.batchesScreen();
    }
  }

  renderBar(screen) {
    const title = h('h1', { class: 'bar-title', text: screen.title });
    if (screen.bare) return [h('span', { class: 'bar-mark' }, icon('sack')), title];
    if (!screen.back) {
      const settings = h('a', { class: 'icon-button', href: routeHash('settings'), 'aria-label': this.t('title_settings') },
        icon('settings'));
      return [h('span', { class: 'bar-mark' }, icon('sack')), title, settings];
    }
    const back = h('a', { class: 'icon-button', href: screen.back.href, 'aria-label': screen.back.label }, icon('back'));
    return [back, title];
  }

  backToBatches() {
    return { href: routeHash('batches'), label: this.t('title_batches') };
  }

  batchesScreen() {
    const labels = batchLabels(this.contract).filter(label => this.batches.has(label));
    const list = h('ul', { class: 'batches' }, labels.map(label => this.batchRow(this.batches.get(label))));
    const free = freeBatchLabels(this.contract, this.batches.keys());
    const add = free.length > 0
      ? h('a', { class: 'button button-primary', href: routeHash('check') }, icon('plus'), h('span', { text: this.t('button_add_batch') }))
      : h('button', { class: 'button button-primary', type: 'button', disabled: true },
        icon('plus'), h('span', { text: this.t('button_add_batch') }));
    return {
      title: this.t('title_batches'),
      body: labels.length > 0 ? [list] : [h('div', { class: 'empty' }, icon('sack', 'empty-mark'))],
      dock: [add],
    };
  }

  batchRow(batch) {
    const band = batch.result ? batch.result.band : null;
    const messageKey = band ? bandMessage(this.contract, band) : null;
    const href = batch.result ? routeHash('result', batch.label) : routeHash('check', batch.label);
    return h('li', {},
      h('a', { class: `batch${band ? ` band-${band}` : ' batch-unchecked'}`, href },
        h('span', { class: 'batch-badge' }, icon(band ? `band-${band}` : 'pending')),
        h('span', { class: 'batch-text' },
          h('span', { class: 'batch-label', text: batch.label }),
          messageKey ? h('span', { class: 'batch-band', text: this.t(messageKey) }) : null,
          h('time', { class: 'batch-date', datetime: batch.checkedAt, text: this.formatDate(batch.checkedAt) }))));
  }

  checkScreen(label) {
    const labels = batchLabels(this.contract);
    if (label !== null && !labels.includes(label)) return { redirect: routeHash('batches') };
    const existing = label === null ? null : this.batches.get(label) ?? null;
    if (label === null && freeBatchLabels(this.contract, this.batches.keys()).length === 0) {
      return { redirect: routeHash('batches') };
    }
    const answers = existing ? keepValidAnswers(this.contract, existing.answers) : {};
    if (label !== null) answers[BATCH_LABEL_INPUT] = label;
    const draft = { answers, fixedLabel: label };
    const form = h('form', { class: 'check', id: 'check-form', novalidate: true });
    for (const input of this.contract.inputs) form.append(this.question(input, draft));
    form.addEventListener('submit', event => {
      event.preventDefault();
      this.submitCheck(form, draft);
    });
    const back = existing && existing.result
      ? { href: routeHash('result', label), label: this.t('title_result') }
      : this.backToBatches();
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
    const fieldset = h('fieldset', { class: `question question-${input.type}`, 'data-name': input.name },
      h('legend', { id: legendId },
        icon('alert', 'missing-mark'),
        h('span', { text: this.t(`question_${input.name}`) })));
    const markAnswered = () => {
      if (isValidAnswer(input, draft.answers[input.name], this.contract.dont_know_value)) delete fieldset.dataset.missing;
    };
    if (input.type === 'choice') fieldset.append(this.choiceOptions(input, draft, markAnswered));
    else if (input.type === 'integer') fieldset.append(...this.integerControl(input, draft, legendId, markAnswered));
    else if (input.type === 'date') fieldset.append(...this.dateControl(input, draft, legendId, markAnswered));
    else throw new Error(`input ${input.name} has unsupported type ${input.type}`);
    return fieldset;
  }

  optionTile({ type, name, value, checked, text, extraClass = '', onchange }) {
    return h('label', { class: `option ${extraClass}`.trim() },
      h('input', { type, name, value, checked, onchange }),
      h('span', { class: 'option-face' }, icon('check', 'option-tick'), h('span', { text })));
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
    const field = h('input', {
      type: 'date', class: 'date', max: localDateString(new Date()), 'aria-labelledby': legendId,
      value: isCalendarDate(current) ? current : null,
    });
    let toggle = null;
    const onPick = () => {
      if (isCalendarDate(field.value)) draft.answers[input.name] = field.value;
      else delete draft.answers[input.name];
      if (toggle) toggle.querySelector('input').checked = false;
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
        markAnswered();
      });
      controls.push(h('div', { class: 'options' }, toggle));
    }
    return controls;
  }

  submitCheck(form, draft) {
    let first = null;
    for (const input of this.contract.inputs) {
      const fieldset = form.querySelector(`fieldset[data-name="${input.name}"]`);
      const answered = isValidAnswer(input, draft.answers[input.name], this.contract.dont_know_value);
      if (answered) {
        delete fieldset.dataset.missing;
      } else {
        fieldset.dataset.missing = 'true';
        first ??= fieldset;
      }
    }
    if (first) {
      first.scrollIntoView({ block: 'start' });
      const control = first.querySelector('input:not([disabled])');
      if (control) control.focus({ preventScroll: true });
      return;
    }
    const label = draft.answers[BATCH_LABEL_INPUT];
    const previous = this.batches.get(label);
    this.batches.set(label, {
      label,
      answers: { ...draft.answers },
      checkedAt: new Date().toISOString(),
      result: null,
      actions: previous ? previous.actions : [],
    });
    this.persist();
    location.hash = routeHash('batches');
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
    const body = [
      h('p', { class: 'result-batch' },
        h('span', { class: 'result-label', text: batch.label }),
        h('time', { datetime: batch.checkedAt, text: this.formatDate(batch.checkedAt) })),
      h('section', { class: `band band-${band}` },
        icon(`band-${band}`, 'band-icon'),
        h('p', { class: 'band-text', text: this.t(messageKey) })),
    ];
    if (shownReasons.length > 0) {
      body.push(h('ul', { class: 'reasons' }, shownReasons.map(reason => h('li', {}, icon('reason'), h('span', { text: this.t(reason) })))));
    }
    if (action) body.push(h('p', { class: 'action' }, icon('action'), h('span', { text: this.t(action) })));
    body.push(h('p', { class: 'synthetic', text: this.t('synthetic_label') }));
    body.push(this.recordSection(batch));
    return {
      title: this.t('title_result'),
      back: this.backToBatches(),
      body,
      dock: [h('a', { class: 'button button-secondary', href: routeHash('check', batch.label) },
        icon('reload'), h('span', { text: this.t('button_check') }))],
    };
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
    const deleteAll = h('section', { class: 'setting' }, h('div', { class: 'setting-mark' }, icon('trash')),
      h('button', { class: 'button button-danger', type: 'button', onclick: () => this.deleteAll() },
        h('span', { text: this.t('button_delete_all') })));
    return {
      title: this.t('title_settings'),
      back: this.backToBatches(),
      body: [this.languageChoices(), deleteAll],
    };
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
// and a reload button only.
function renderFatal(error) {
  console.error(error);
  const main = document.getElementById('main');
  document.getElementById('bar').replaceChildren();
  const dock = document.getElementById('dock');
  dock.replaceChildren();
  dock.hidden = true;
  main.replaceChildren(h('div', { class: 'fatal' },
    icon('alert', 'fatal-mark'),
    h('button', { class: 'button button-secondary', type: 'button', onclick: () => location.reload() }, icon('reload'))));
}

export async function boot() {
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
    const app = new App({ contract, languages, store });
    if (fixtureMode) await app.loadFixtures();
    window.addEventListener('hashchange', () => app.render());
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
