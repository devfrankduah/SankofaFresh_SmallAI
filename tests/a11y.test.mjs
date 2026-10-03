// WCAG AA colour checks for web/styles.css. The pairs below are every text and status colour the app
// draws and the background it sits on; the tokens are read from the stylesheet, so a colour change
// that breaks contrast fails here. Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../web/styles.css', import.meta.url), 'utf8');
const TOKENS = Object.fromEntries([...CSS.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, hex]) => [name, hex.toLowerCase()]));
const TEXT = 4.5;
const NON_TEXT = 3;

function luminance(hex) {
  const channel = value => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [1, 3, 5].map(start => channel(parseInt(hex.slice(start, start + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// [foreground token, background token, minimum, where it is used]; "page" is also the white used for
// text on tarp, green, red and slate.
const PAIRS = [
  ['ink', 'page', TEXT, 'body text, questions, option labels'],
  ['ink-soft', 'page', TEXT, 'dates, weather note, "Not evaluated", file sizes'],
  ['ink', 'parchment', TEXT, 'SYNTHETIC_DEMO note, demo notes'],
  ['ink', 'tarp-soft', TEXT, 'action text'],
  ['page', 'tarp', TEXT, 'bar title, primary buttons, selected options'],
  ['tarp', 'page', TEXT, 'secondary buttons, Copy and Record'],
  ['tarp', 'parchment', TEXT, '"About this check" link'],
  ['red', 'page', TEXT, 'notices, missing-answer questions, Delete all'],
  ['jute', 'page', TEXT, '"Demo data" tag on a batch row'],
  ['page', 'green', TEXT, 'green band text'],
  ['amber-ink', 'amber', TEXT, 'amber band text'],
  ['page', 'red', TEXT, 'red band text'],
  ['page', 'unsure', TEXT, 'not sure band text'],
  ['control-edge', 'page', NON_TEXT, 'option, date, SMS and batch boundaries, slider track and empty thumb'],
  ['tarp', 'page', NON_TEXT, 'selected option, step buttons, slider thumb'],
  ['red', 'page', NON_TEXT, 'missing-answer marks and borders'],
  ['jute', 'page', NON_TEXT, 'reason icons, setting icons, demo icon'],
  ['jute', 'parchment', NON_TEXT, 'unchecked batch badge, demo model icon'],
  ['green', 'page', NON_TEXT, 'recorded action ticks'],
  ['tarp', 'tarp-soft', NON_TEXT, 'action arrow'],
  ['parchment', 'tarp', NON_TEXT, 'sack mark in the bar'],
  ['ink', 'page', NON_TEXT, 'keyboard focus ring'],
  ['page', 'tarp', NON_TEXT, 'keyboard focus ring inside the bar'],
];

test('every colour pair the app draws meets WCAG AA', () => {
  const failures = [];
  for (const [fg, bg, minimum, where] of PAIRS) {
    assert.ok(TOKENS[fg] && TOKENS[bg], `missing token ${TOKENS[fg] ? bg : fg}`);
    const ratio = contrast(TOKENS[fg], TOKENS[bg]);
    if (ratio < minimum) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${minimum} (${where})`);
  }
  assert.deepEqual(failures, []);
});

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(CSS);
  assert.ok(match, `no rule for ${selector}`);
  return match[2];
}

test('every control boundary uses --control-edge, never the decorative --line', () => {
  for (const selector of ['.option-face', '.date', '.sms-text', '.batch', '.slider::-webkit-slider-runnable-track', '.slider::-moz-range-track']) {
    const body = rule(selector);
    assert.match(body, /border:[^;]*var\(--control-edge\)/, selector);
  }
});

test('no state is shown by fading alone', () => {
  assert.doesNotMatch(CSS, /\bopacity:\s*0?\.\d/, 'a faded control loses its contrast; use a shape or an outline instead');
});

test('keyboard focus is always visible and never hidden under the bar or dock', () => {
  assert.match(rule(':focus-visible'), /outline:\s*3px solid var\(--ink\)/);
  assert.match(rule('.option input:focus-visible + .option-face'), /outline:\s*3px solid/);
  assert.match(rule('html'), /scroll-padding-top:/);
  assert.match(rule('html'), /scroll-padding-bottom:/);
});
