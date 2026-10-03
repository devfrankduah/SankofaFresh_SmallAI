"""Evaluate the shipped tree against the humidity-only baseline on held-out farms (spec 7, AC10).

Run from the repository root:  python -m model.evaluate
Writes evidence/metrics.json (full detail), web/metrics.json (the app's evidence screen) and evidence/demo_batches.json.
Every number is on SYNTHETIC_DEMO labels: it shows how well the tree recovers the spec 6 rule, not field accuracy.
"""
from __future__ import annotations

import json
import math
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Mapping, Sequence

from sklearn.metrics import f1_score

from data.gen_batches import load_config
from model.bands import band, humidity_baseline
from model.contract import CONTRACT, encode
from model.train import load_rows
from model.tree_format import leaf_for, validate_tree

ROOT = Path(__file__).resolve().parents[1]
TREE_PATH = ROOT / 'web' / 'tree.json'
WEATHER_PATH = ROOT / 'web' / 'weather.json'
EVIDENCE_PATH = ROOT / 'evidence' / 'metrics.json'
WEB_METRICS_PATH = ROOT / 'web' / 'metrics.json'
DEMO_PATH = ROOT / 'evidence' / 'demo_batches.json'
CLASSES = CONTRACT['classes']
ABSTAIN = CONTRACT['abstention']['band']
INPUTS = CONTRACT['inputs']
SPLITS = ('test', 'season_stress')
DRY_WEEKS_RH = 70.0
DEFINITIONS = {
    'coverage': 'share of batches that get a green, amber or red result (not not_sure)',
    'abstain_rate': 'share of batches that get not_sure; 1 minus coverage',
    'accuracy': 'share of covered batches whose result equals the synthetic label',
    'macro_f1': 'mean F1 over green, amber and red, on covered batches; a class never predicted scores 0',
    'red_recall': 'share of all truly red batches shown as red; a red batch shown as not_sure counts as not recalled',
    'false_reassurance_rate': 'share of all truly red batches shown as green',
}


def inputs_of(row: Mapping[str, str]) -> dict[str, Any]:
    return {field['name']: int(row[field['name']]) if field['type'] == 'integer' else row[field['name']] for field in INPUTS}


def tree_result(row: Mapping[str, str], tree: Mapping[str, Any], weather: Mapping[str, Any]) -> tuple[str, str | None]:
    """The result the app would show: encode with the tree's ranges, walk the tree, apply the band rule."""
    encoded = encode(inputs_of(row), weather, tree)
    if encoded.features is None:
        return ABSTAIN, encoded.abstain_reason
    result = band(leaf_for(tree, encoded.features)['value'], tree['abstain_cut'])
    return result, ('reason_low_confidence' if result == ABSTAIN else None)


def metrics(truth: Sequence[str], predicted: Sequence[str]) -> dict[str, float | None]:
    covered = [(t, p) for t, p in zip(truth, predicted) if p != ABSTAIN]
    reds = [p for t, p in zip(truth, predicted) if t == 'red']
    coverage = len(covered) / len(truth)
    return {
        'accuracy': sum(t == p for t, p in covered) / len(covered) if covered else None,
        'macro_f1': float(f1_score([t for t, _ in covered], [p for _, p in covered], labels=CLASSES, average='macro',
                                   zero_division=0)) if covered else None,
        'red_recall': sum(p == 'red' for p in reds) / len(reds) if reds else None,
        'false_reassurance_rate': sum(p == 'green' for p in reds) / len(reds) if reds else None,
        'abstain_rate': 1 - coverage,
        'coverage': coverage,
    }


def confusion(truth: Sequence[str], predicted: Sequence[str]) -> dict[str, dict[str, int]]:
    return {t: {p: sum(1 for a, b in zip(truth, predicted) if a == t and b == p) for p in CLASSES + [ABSTAIN]} for t in CLASSES}


def counts(values: Sequence[str]) -> dict[str, int]:
    return {name: values.count(name) for name in CLASSES + [ABSTAIN] if values.count(name)}


def evaluate_split(rows: list[Mapping[str, str]], tree: Mapping[str, Any], weather: Mapping[str, Any]) -> dict[str, Any]:
    truth = [row['label'] for row in rows]
    tree_out = [tree_result(row, tree, weather) for row in rows]
    tree_bands = [b for b, _ in tree_out]
    baseline = [humidity_baseline([float(row[f'feature_{f["name"]}']) for f in CONTRACT['features']]) for row in rows]
    subset = [i for i, row in enumerate(rows) if row['rewetted'] == 'yes' and float(row['feature_rh14_mean']) < DRY_WEEKS_RH]
    flagged = [i for i in subset if truth[i] in ('amber', 'red')]
    return {
        'rows': len(rows),
        'labels': counts(truth),
        'tree': metrics(truth, tree_bands),
        'baseline': metrics(truth, baseline),
        'tree_confusion': confusion(truth, tree_bands),
        'baseline_confusion': confusion(truth, baseline),
        'tree_abstain_reasons': dict(sorted(Counter(reason for _, reason in tree_out if reason).items())),
        'tree_red_shown_red_or_not_sure': (sum(tree_bands[i] in ('red', ABSTAIN) for i, t in enumerate(truth) if t == 'red')
                                           / max(1, truth.count('red'))),
        'rewetted_in_dry_weeks': {
            'rule': f'rewetted is yes and rh14_mean below {DRY_WEEKS_RH:g}',
            'rows': len(subset),
            'labels': counts([truth[i] for i in subset]),
            'tree': counts([tree_bands[i] for i in subset]),
            'baseline': counts([baseline[i] for i in subset]),
            'amber_or_red_rows': len(flagged),
            'tree_green_on_amber_or_red': sum(tree_bands[i] == 'green' for i in flagged),
            'baseline_green_on_amber_or_red': sum(baseline[i] == 'green' for i in flagged),
        },
    }


def documented_rule_band(inputs: Mapping[str, Any], rh14_mean: float, config: Mapping[str, Any]) -> tuple[float, str]:
    """The spec 6 latent rule with no noise and no farm offset, to say what the documented rule expects."""
    mc_dry = (config['mc_dry_base'] - config['mc_dry_slope_per_day'] * min(inputs['days_drying'], config['mc_dry_day_cap'])
              + (config['rewetted_moisture_add'] if inputs['rewetted'] == 'yes' else 0.0))
    emc = (config['emc_at_reference_rh'] + config['emc_slope_per_rh_point'] * (rh14_mean - config['emc_reference_rh'])
           + (config['floor_moisture_add'] if inputs['storage_surface'] == 'floor' else 0.0))
    moisture = mc_dry + (emc - mc_dry) * (1 - math.exp(-inputs['days_stored'] / config['storage_time_constant_days']))
    label = 'green' if moisture < config['green_below'] else 'amber' if moisture < config['red_from'] else 'red'
    return round(moisture, 2), label


DEMO_BATCHES = [
    ('clearly_safe', 'Dried 12 days, never rewetted, raised, no musty smell, dry by the hand test, 20 days in store.',
     {'batch_label': 'Batch 1', 'days_drying': 12, 'rewetted': 'no', 'storage_surface': 'raised', 'musty_smell': 'no',
      'dryness_check': 'dry', 'days_stored': 20, 'storage_start': '2025-03-01'}),
    ('rewetted_dry_weeks', 'Dried 8 days and rained on during drying, damp by the hand test, then 10 days in store in dry January weeks.',
     {'batch_label': 'Batch 2', 'days_drying': 8, 'rewetted': 'yes', 'storage_surface': 'raised', 'musty_smell': 'no',
      'dryness_check': 'damp', 'days_stored': 10, 'storage_start': '2025-01-15'}),
    ('missing_input', 'Same as the first batch, but the farmer did not do the hand test and answered "Don\'t know".',
     {'batch_label': 'Batch 3', 'days_drying': 12, 'rewetted': 'no', 'storage_surface': 'raised', 'musty_smell': 'no',
      'dryness_check': 'dont_know', 'days_stored': 20, 'storage_start': '2025-03-01'}),
]


def demo_batches(tree: Mapping[str, Any], weather: Mapping[str, Any]) -> list[dict[str, Any]]:
    config = load_config()
    names = [feature['name'] for feature in CONTRACT['features']]
    out = []
    for name, description, inputs in DEMO_BATCHES:
        encoded = encode(inputs, weather, tree)
        entry: dict[str, Any] = {'id': name, 'description': description, 'inputs': inputs}
        if encoded.features is None:
            entry.update({'tree': ABSTAIN, 'reason': encoded.abstain_reason, 'baseline': None})
        else:
            leaf = leaf_for(tree, encoded.features)
            rh14_mean = encoded.features[names.index('rh14_mean')]
            entry.update({'features': encoded.features, 'tree': band(leaf['value'], tree['abstain_cut']),
                          'tree_probabilities': dict(zip(CLASSES, leaf['value'])), 'baseline': humidity_baseline(encoded.features)})
            entry['documented_rule_moisture'], entry['documented_rule_band'] = documented_rule_band(inputs, rh14_mean, config)
        out.append(entry)
    return out


def rounded(values: Mapping[str, float | None]) -> dict[str, float | None]:
    return {name: None if values[name] is None else round(values[name], 4) for name in CONTRACT['metrics']}


def build() -> dict[Path, str]:
    """Every evaluation output as file text, keyed by path. Writing is separate so tests can compare without writing."""
    tree = json.loads(TREE_PATH.read_text())
    validate_tree(tree)
    weather = json.loads(WEATHER_PATH.read_text())
    rows = load_rows()
    detail = {
        'evidence_mode': 'SYNTHETIC_DEMO',
        'note': 'Results on synthetic labels from the spec 6 rule. They show how well the tree recovers that rule '
                'compared with a one-variable humidity rule. They are not field accuracy.',
        'model_version': tree['model_version'], 'tree_sha256': tree['sha256'], 'abstain_cut': tree['abstain_cut'],
        'dataset_sha256': tree['training']['dataset_sha256'],
        'definitions': DEFINITIONS,
        'tree_pipeline': 'model/contract.py encode with tree feature_ranges (rule 2), then tree.json, then the band rule; '
                         'the same steps as the app',
        'baseline': 'red if rh14_mean is above 80, otherwise green (spec 7)',
        'splits': {split: evaluate_split([r for r in rows if r['split'] == split], tree, weather) for split in SPLITS},
    }
    web = {'model_version': tree['model_version'], 'tree_sha256': tree['sha256'],
           'tree': rounded(detail['splits']['test']['tree']), 'baseline': rounded(detail['splits']['test']['baseline'])}
    demo = {'evidence_mode': 'SYNTHETIC_DEMO', 'model_version': tree['model_version'],
            'note': 'Hand-built demo batches for the video, run through the shipped tree with the Bepong 2025 weather. '
                    'documented_rule_band is the spec 6 rule with no noise; it is what the synthetic labels follow, not a measurement.',
            'batches': demo_batches(tree, weather)}
    return {path: json.dumps(data, indent=2) + '\n' for path, data in
            ((EVIDENCE_PATH, detail), (WEB_METRICS_PATH, web), (DEMO_PATH, demo))}


def main(argv: list[str]) -> None:
    outputs = build()
    for path, text in outputs.items():
        path.write_text(text)
    detail = json.loads(outputs[EVIDENCE_PATH])
    for split, result in detail['splits'].items():
        print(f'{split} ({result["rows"]} batches)')
        for who in ('tree', 'baseline'):
            print(f'  {who:8s} ' + '  '.join(f'{k} {"n/a" if v is None else f"{v:.3f}"}' for k, v in result[who].items()))
        print(f'  rewetted in dry weeks: {result["rewetted_in_dry_weeks"]}')


if __name__ == '__main__':
    main(sys.argv[1:])
