"""Write tests/fixtures/parity_cases.json: what scikit-learn says for every held-out row and for boundary cases
around each exported threshold. tests/test_parity.mjs holds web/tree.js to it.

Run from the repository root:  python -m model.parity
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

from model.bands import band
from model.tree_format import nodes_sha256, validate_tree
from model.train import fit, load_rows, matrix

ROOT = Path(__file__).resolve().parents[1]
TREE_PATH = ROOT / 'web' / 'tree.json'
FIXTURE_PATH = ROOT / 'tests' / 'fixtures' / 'parity_cases.json'
HELD_OUT = ('validation', 'test', 'season_stress')
SAMPLE_TREE_PATH = ROOT / 'tests' / 'fixtures' / 'sample_tree.json'


def float32_neighbours(threshold: float) -> dict[str, float]:
    """Values just either side of a float64 threshold once cast to float32, plus the threshold itself."""
    below = np.float32(threshold)
    if float(below) > threshold:
        below = np.nextafter(below, np.float32(-np.inf))
    above = np.nextafter(below, np.float32(np.inf))
    return {'largest_float32_at_or_below': float(below), 'smallest_float32_above': float(above),
            'threshold': threshold, 'next_float64_above': float(np.nextafter(threshold, np.inf))}


def boundary_cases(model: Any, tree: dict[str, Any], X_held_out: np.ndarray) -> list[dict[str, Any]]:
    """For each split, take the first held-out row that passes through it and move only the split feature."""
    paths = model.decision_path(X_held_out).toarray().astype(bool)
    cases = []
    for node in tree['nodes']:
        if 'value' in node:
            continue
        through = np.flatnonzero(paths[:, node['id']])
        base = X_held_out[through[0]] if len(through) else X_held_out[0]
        for label, value in float32_neighbours(node['threshold']).items():
            features = base.copy()
            features[node['feature']] = value
            cases.append({'node': node['id'], 'kind': label, 'features': [float(v) for v in features],
                          'reaches_node': bool(model.decision_path(features.reshape(1, -1)).toarray()[0, node['id']])})
    return cases


def tie_tree_and_cases() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """The real tree has no tied leaves, so a small tree with ties checks the first-maximum rule on both sides."""
    tree = json.loads(SAMPLE_TREE_PATH.read_text())
    tree['model_version'] = 'tree-v2-ties'
    tree['abstain_cut'] = 0.4
    tree['nodes'][1]['value'] = [0.45, 0.1, 0.45]
    tree['nodes'][2]['value'] = [0.1, 0.45, 0.45]
    tree['sha256'] = nodes_sha256(tree['nodes'])
    validate_tree(tree)
    split = tree['nodes'][0]
    cases = []
    for value in (split['threshold'] - 10.0, split['threshold'] + 10.0):
        features = [12.0, 0.0, 0.0, 0.0, 0.0, 30.0, 70.0, 75.0, 20.0]
        features[split['feature']] = value
        leaf = 1 if np.float32(value) <= split['threshold'] else 2
        cases.append({'features': features, 'leaf': leaf, 'band': band(tree['nodes'][leaf]['value'], tree['abstain_cut'])})
    return tree, cases


def build() -> dict[str, Any]:
    tree = json.loads(TREE_PATH.read_text())
    rows = load_rows()
    model = fit(*matrix(rows, 'train'), tree['training']['seed'])
    # Same order as matrix(): each held-out split in turn, rows in file order.
    X_held_out = np.vstack([matrix(rows, split)[0] for split in HELD_OUT])
    ordered_ids = [row['batch_id'] for split in HELD_OUT for row in rows if row['split'] == split]

    boundary = boundary_cases(model, tree, X_held_out)
    tie_tree, tie_cases = tie_tree_and_cases()
    X_boundary = np.array([case['features'] for case in boundary])
    leaf_probabilities: dict[str, list[float]] = {}
    for X in (X_held_out, X_boundary):
        for leaf, probabilities in zip(model.apply(X), model.predict_proba(X)):
            leaf_probabilities[str(int(leaf))] = [float(p) for p in probabilities]

    def expected(X: np.ndarray) -> list[dict[str, Any]]:
        return [{'leaf': int(leaf), 'band': band([float(p) for p in probabilities], tree['abstain_cut'])}
                for leaf, probabilities in zip(model.apply(X), model.predict_proba(X))]

    return {
        'description': 'scikit-learn predict_proba, apply and the model/bands.py band for every held-out row (features are '
                       'in data/batches.csv) and for boundary cases around each exported threshold. Rebuild with python -m model.parity.',
        'tree_sha256': tree['sha256'],
        'abstain_cut': tree['abstain_cut'],
        'leaf_probabilities': dict(sorted(leaf_probabilities.items(), key=lambda item: int(item[0]))),
        'held_out': [{'batch_id': batch_id, **result} for batch_id, result in zip(ordered_ids, expected(X_held_out))],
        'boundary': [{**case, **result} for case, result in zip(boundary, expected(X_boundary))],
        'tie_tree': tie_tree,
        'tie_cases': tie_cases,
    }


def to_text(fixture: dict[str, Any]) -> str:
    # One case per line keeps a 2,880-row fixture readable in diffs without indenting every field.
    head = {key: value for key, value in fixture.items() if key not in ('held_out', 'boundary', 'tie_tree', 'tie_cases')}
    lines = ['{'] + [f'  {json.dumps(key)}: {json.dumps(value)},' for key, value in head.items()]
    for section in ('held_out', 'boundary'):
        items = fixture[section]
        lines.append(f'  {json.dumps(section)}: [')
        lines += [f'    {json.dumps(item)}{"," if i < len(items) - 1 else ""}' for i, item in enumerate(items)]
        lines.append('  ],')
    lines.append(f'  "tie_tree": {json.dumps(fixture["tie_tree"])},')
    lines.append(f'  "tie_cases": {json.dumps(fixture["tie_cases"])}')
    lines.append('}')
    return '\n'.join(lines) + '\n'


def main(argv: list[str]) -> None:
    fixture = build()
    FIXTURE_PATH.write_text(to_text(fixture))
    reaching = sum(case['reaches_node'] for case in fixture['boundary'])
    print(f'{len(fixture["held_out"])} held-out rows, {len(fixture["boundary"])} boundary cases '
          f'({reaching} still reach their split), {FIXTURE_PATH.stat().st_size} bytes')


if __name__ == '__main__':
    main(sys.argv[1:])
