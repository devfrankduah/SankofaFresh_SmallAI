// Tests for the result screen's pure parts: reason icons, the humidity window and the line geometry.
// Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { REASON_ICONS, humiditySeries, reasonIcon, sparklinePoints } from '../web/app.js';
import { weatherFeatures } from '../web/features.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const CONTRACT = JSON.parse(read('web/contract.json'));
const WEATHER = JSON.parse(read('web/weather.json'));
const HTML = read('web/index.html');
const CSS = read('web/styles.css');

test('every reason the contract can show has its own drawn icon', () => {
  const drawn = new Set([...HTML.matchAll(/<symbol id="i-([a-z_-]+)"/g)].map(match => match[1]));
  for (const key of CONTRACT.message_keys.filter(k => k.startsWith('reason_'))) {
    assert.ok(Object.hasOwn(REASON_ICONS, key), `${key} has no icon`);
    assert.ok(drawn.has(reasonIcon(key)), `${key}: i-${reasonIcon(key)} is not drawn`);
  }
  assert.equal(reasonIcon('reason_from_the_future'), 'reason');
});

function base(storageStart, daysStored) {
  return { days_drying: 10, rewetted: 'no', storage_surface: 'raised', musty_smell: 'no', dryness_check: 'dry', days_stored: daysStored, storage_start: storageStart, batch_label: 'Batch 1' };
}

test('the humidity line uses the same 14 days as the model features, for every day of the year', () => {
  let checked = 0;
  for (let day = 0; day < 365; day += 1) {
    const start = new Date(Date.UTC(2025, 0, 1 + day)).toISOString().slice(0, 10);
    for (const daysStored of [0, 13, 30, 180]) {
      const series = humiditySeries(CONTRACT, base(start, daysStored), WEATHER);
      const features = weatherFeatures(start, daysStored, WEATHER, CONTRACT);
      assert.equal(series.length, CONTRACT.weather_window.days);
      let total = 0;
      for (const value of series) total += value;
      assert.equal(total / series.length, features.rh14_mean, `${start} + ${daysStored}`);
      assert.equal(Math.max(...series), features.rh14_max, `${start} + ${daysStored}`);
      checked += 1;
    }
  }
  assert.equal(checked, 1460);
});

test('no humidity line without a date, a day count or a weather table', () => {
  assert.equal(humiditySeries(CONTRACT, base('dont_know', 30), WEATHER), null);
  assert.equal(humiditySeries(CONTRACT, base('2025-03-01', 'dont_know'), WEATHER), null);
  assert.equal(humiditySeries(CONTRACT, base('2025-03-01', 30), null), null);
  assert.equal(humiditySeries(CONTRACT, base('2025-03-01', 30), { days: [] }), null);
  assert.equal(humiditySeries(CONTRACT, null, WEATHER), null);
});

test('the line spans the box and keeps out-of-range values on its edge', () => {
  const points = sparklinePoints([40, 70, 100, 120, 10], { width: 300, height: 56, low: 40, high: 100 });
  assert.deepEqual(points.map(([x]) => x), [0, 75, 150, 225, 300]);
  assert.deepEqual(points.map(([, y]) => y), [56, 28, 0, 0, 56]);
  assert.deepEqual(sparklinePoints([80], { width: 300, height: 56, low: 40, high: 100 }), [[0, 18.7]]);
});

// Removes every "@media (prefers-reduced-motion: no-preference) { ... }" block, braces balanced.
function withoutMotionBlocks(css) {
  let out = '';
  let index = 0;
  const marker = '@media (prefers-reduced-motion: no-preference)';
  for (let start = css.indexOf(marker); start !== -1; start = css.indexOf(marker, index)) {
    out += css.slice(index, start);
    let depth = 0;
    let cursor = css.indexOf('{', start);
    do {
      if (css[cursor] === '{') depth += 1;
      if (css[cursor] === '}') depth -= 1;
      cursor += 1;
    } while (depth > 0);
    index = cursor;
  }
  return out + css.slice(index);
}

test('all motion sits behind prefers-reduced-motion: no-preference', () => {
  assert.match(CSS, /prefers-reduced-motion: no-preference/);
  const rest = withoutMotionBlocks(CSS);
  assert.doesNotMatch(rest, /\banimation\s*:|@keyframes|\btransition\s*:/);
});

test('the stamp only lands, and only vibrates, when reduced motion is off', () => {
  const app = read('web/app.js');
  const body = app.slice(app.indexOf('  landStamp() {'), app.indexOf('  notices() {'));
  assert.match(body, /prefers-reduced-motion: reduce/);
  assert.ok(body.indexOf('prefers-reduced-motion') < body.indexOf('vibrate'), 'the motion check comes before vibrating');
});

test('every question and every answer the contract offers has a drawn picture', async () => {
  const { OPTION_ICONS, QUESTION_ART } = await import('../web/app.js');
  const drawn = new Set([...HTML.matchAll(/<symbol id="i-([a-z_-]+)"/g)].map(match => match[1]));
  for (const input of CONTRACT.inputs) {
    assert.ok(drawn.has(QUESTION_ART[input.name]), `question ${input.name}`);
    if (input.type !== 'choice' || input.name === 'batch_label') continue;
    for (const value of input.values) assert.ok(drawn.has(OPTION_ICONS[value]), `answer ${value}`);
  }
  assert.ok(drawn.has(OPTION_ICONS[CONTRACT.dont_know_value]), "Don't know");
});
