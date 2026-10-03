"""Train the depth-4 tree on the train farms, tune abstain_cut on validation farms only, export web/tree.json.

Run from the repository root:  python -m model.train
Also writes docs/tree_rules.md (the tree as readable rules) and evidence/training.json (the abstain_cut search).
Test farms and stress farms are never read here; evaluation (model/evaluate.py) is the only place they are used.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import numpy as np
import sklearn
from sklearn.tree import DecisionTreeClassifier

from model.bands import band
from model.contract import CONTRACT
from model.tree_format import nodes_sha256, validate_tree

ROOT = Path(__file__).resolve().parents[1]
BATCHES_PATH = ROOT / 'data' / 'batches.csv'
MANIFEST_PATH = ROOT / 'data' / 'manifest.json'
TREE_PATH = ROOT / 'web' / 'tree.json'
RULES_PATH = ROOT / 'docs' / 'tree_rules.md'
TRAINING_PATH = ROOT / 'evidence' / 'training.json'
FEATURES = [feature['name'] for feature in CONTRACT['features']]
CLASSES = CONTRACT['classes']
ABSTAIN = CONTRACT['abstention']['band']
MAX_DEPTH = 4
CLASS_WEIGHT = 'balanced'
# ASSUMPTION: the tuned cut may send at most 15 percent of validation batches to not_sure. Within that limit it
# minimises false reassurance (true red shown as green), the error that can cost a farmer the most.
MIN_VALIDATION_COVERAGE = 0.85


def load_rows(path: Path = BATCHES_PATH) -> list[dict[str, str]]:
    with path.open(newline='') as handle:
        return list(csv.DictReader(handle))


def matrix(rows: list[dict[str, str]], split: str) -> tuple[np.ndarray, np.ndarray]:
    chosen = [row for row in rows if row['split'] == split]
    if not chosen:
        raise ValueError(f'no rows in split {split}')
    X = np.array([[float(row[f'feature_{name}']) for name in FEATURES] for row in chosen], dtype=np.float64)
    y = np.array([CLASSES.index(row['label']) for row in chosen], dtype=np.int64)
    return X, y


def fit(X: np.ndarray, y: np.ndarray, seed: int) -> DecisionTreeClassifier:
    model = DecisionTreeClassifier(max_depth=MAX_DEPTH, class_weight=CLASS_WEIGHT, random_state=seed)
    model.fit(X, y)
    if model.classes_.tolist() != list(range(len(CLASSES))):
        raise AssertionError('every class must appear in training, in contract order')
    return model


def leaf_values(model: DecisionTreeClassifier) -> dict[int, list[float]]:
    """Leaf probabilities exactly as predict_proba returns them (scikit-learn 1.9 returns tree_.value unchanged)."""
    tree = model.tree_
    return {node: [float(p) for p in tree.value[node][0][:len(CLASSES)]]
            for node in range(tree.node_count) if tree.children_left[node] == -1}


def check_predict_proba_match(model: DecisionTreeClassifier, values: dict[int, list[float]], X: np.ndarray) -> None:
    exported = np.array([values[int(leaf)] for leaf in model.apply(X)])
    if not np.array_equal(exported, model.predict_proba(X)):
        raise AssertionError('exported leaf values differ from predict_proba')


def export_nodes(model: DecisionTreeClassifier, values: dict[int, list[float]]) -> list[dict[str, Any]]:
    tree = model.tree_
    nodes: list[dict[str, Any]] = []
    for node in range(tree.node_count):
        if node in values:
            nodes.append({'id': node, 'value': values[node]})
        else:
            # Thresholds are written exactly as scikit-learn stores them; rounding would move boundary cases.
            nodes.append({'id': node, 'feature': int(tree.feature[node]), 'threshold': float(tree.threshold[node]),
                          'left': int(tree.children_left[node]), 'right': int(tree.children_right[node])})
    return nodes


def feature_ranges(X: np.ndarray) -> dict[str, list[float]]:
    ranges = {}
    for index, feature in enumerate(CONTRACT['features']):
        low, high = float(X[:, index].min()), float(X[:, index].max())
        ranges[feature['name']] = [int(low), int(high)] if feature['source'] == 'input' else [low, high]
    return ranges


def candidate_cuts(values: dict[int, list[float]]) -> list[float]:
    """One cut per gap between distinct leaf winning probabilities: the smallest 3-decimal number above the lower
    one, kept only if it doesn't pass the higher one. The first candidate abstains nowhere."""
    winners = sorted({max(value) for value in values.values()})
    cuts = [winners[0]]
    for lower, higher in zip(winners, winners[1:]):
        cut = math.floor(lower * 1000 + 1) / 1000
        if lower < cut <= higher:
            cuts.append(cut)
    return cuts


def score(probabilities: np.ndarray, y: np.ndarray, cut: float) -> dict[str, float]:
    predicted = [band(list(p), cut) for p in probabilities]
    truth = [CLASSES[int(label)] for label in y]
    covered = [(t, p) for t, p in zip(truth, predicted) if p != ABSTAIN]
    reds = [p for t, p in zip(truth, predicted) if t == 'red']
    return {'abstain_cut': cut, 'coverage': len(covered) / len(truth),
            'false_reassurance_rate': sum(p == 'green' for p in reds) / len(reds),
            'accuracy_on_covered': sum(t == p for t, p in covered) / len(covered) if covered else 0.0}


def choose_cut(table: list[dict[str, float]]) -> dict[str, float]:
    allowed = [row for row in table if row['coverage'] >= MIN_VALIDATION_COVERAGE]
    return min(allowed, key=lambda row: (row['false_reassurance_rate'], -row['coverage'], row['abstain_cut']))


def narrow(constraints: dict[int, dict[str, Any]], feature_index: int, threshold: float, left: bool) -> dict[int, dict[str, Any]]:
    """The path's constraints after one more split, merged per feature so each feature reads once."""
    feature = CONTRACT['features'][feature_index]
    merged = {index: dict(constraint) for index, constraint in constraints.items()}
    current = merged.setdefault(feature_index, {'above': None, 'at_most': None, 'allowed': None})
    if feature['source'] == 'input' and feature['encoding'] == 'map':
        side = {value for value, code in feature['map'].items() if (code <= threshold) == left}
        current['allowed'] = side if current['allowed'] is None else current['allowed'] & side
    elif left:
        current['at_most'] = threshold if current['at_most'] is None else min(current['at_most'], threshold)
    else:
        current['above'] = threshold if current['above'] is None else max(current['above'], threshold)
    return merged


def describe(feature_index: int, constraint: dict[str, Any]) -> str:
    feature = CONTRACT['features'][feature_index]
    above, at_most = constraint['above'], constraint['at_most']
    if feature['source'] == 'input' and feature['encoding'] == 'map':
        values = [value for value in feature['map'] if value in constraint['allowed']]
        return f'{feature["input"]} is {" or ".join(values)}'
    if feature['source'] == 'input':
        low = None if above is None else math.floor(above) + 1
        high = None if at_most is None else math.floor(at_most)
        name = feature['input']
        if low is not None and high is not None:
            return f'{name} is {low} to {high}'
        return f'{name} is {low} or more' if high is None else f'{name} is {high} or less'
    name = feature['name']
    if above is not None and at_most is not None:
        return f'{name} is above {above:.2f} and at most {at_most:.2f}'
    return f'{name} is above {above:.2f}' if at_most is None else f'{name} is {at_most:.2f} or less'


def rules_markdown(model: DecisionTreeClassifier, tree_json: dict[str, Any], chosen: dict[str, float]) -> str:
    tree = model.tree_
    lines = ['# Decision tree rules', '',
             f'Model `{tree_json["model_version"]}`, sha256 `{tree_json["sha256"]}`. Written by `python -m model.train`; do not edit by hand.', '',
             'SYNTHETIC_DEMO: the tree learned the spec 6 labelling rule from synthetic batches. These rules describe what it uses, not proven causes, and not field results.', '',
             f'A result is not_sure when the winning probability is below abstain_cut = {tree_json["abstain_cut"]}. The cut was chosen on validation farms only: '
             f'the lowest false reassurance rate with at least {MIN_VALIDATION_COVERAGE:.0%} of batches covered '
             f'(validation coverage {chosen["coverage"]:.1%}, false reassurance {chosen["false_reassurance_rate"]:.1%}).', '',
             'Thresholds are rounded here for reading; `web/tree.json` holds the exact values. Probabilities are class-weighted, as trained.', '']
    leaf_number = 0

    def walk(node: int, constraints: dict[int, dict[str, Any]]) -> None:
        nonlocal leaf_number
        if tree.children_left[node] == -1:
            conditions = [describe(index, constraint) for index, constraint in constraints.items()]
            leaf_number += 1
            value = tree_json['nodes'][node]['value']
            shown = band(value, tree_json['abstain_cut'])
            lines.append(f'## Rule {leaf_number} (leaf {node}): {shown}')
            lines.append('')
            lines.extend([f'- {condition}' for condition in conditions] or ['- every batch'])
            probabilities = ', '.join(f'{name} {p:.3f}' for name, p in zip(CLASSES, value))
            lines.append(f'- Probabilities: {probabilities}. Training batches reaching this leaf: {int(tree.n_node_samples[node])}.')
            lines.append('')
            return
        feature, threshold = int(tree.feature[node]), float(tree.threshold[node])
        walk(int(tree.children_left[node]), narrow(constraints, feature, threshold, True))
        walk(int(tree.children_right[node]), narrow(constraints, feature, threshold, False))

    walk(0, {})
    return '\n'.join(lines).rstrip() + '\n'


def train(out_tree: Path = TREE_PATH, out_rules: Path = RULES_PATH, out_training: Path = TRAINING_PATH) -> dict[str, Any]:
    manifest = json.loads(MANIFEST_PATH.read_text())
    if hashlib.sha256(BATCHES_PATH.read_bytes()).hexdigest() != manifest['batches_sha256']:
        raise SystemExit('data/batches.csv does not match data/manifest.json; regenerate with python -m data.gen_batches')
    seed = int(manifest['seed'])
    rows = load_rows()
    X_train, y_train = matrix(rows, 'train')
    X_validation, y_validation = matrix(rows, 'validation')
    model = fit(X_train, y_train, seed)
    values = leaf_values(model)
    check_predict_proba_match(model, values, X_train)
    check_predict_proba_match(model, values, X_validation)

    validation_probabilities = model.predict_proba(X_validation)
    table = [score(validation_probabilities, y_validation, cut) for cut in candidate_cuts(values)]
    chosen = choose_cut(table)

    nodes = export_nodes(model, values)
    digest = nodes_sha256(nodes)
    tree_json = {
        'schema_version': 2,
        'model_version': f'tree-v2-{digest[:7]}',
        'evidence_mode': CONTRACT['evidence_mode'],
        'feature_names': FEATURES,
        'feature_ranges': feature_ranges(X_train),
        'classes': CLASSES,
        'abstain_cut': chosen['abstain_cut'],
        'nodes': nodes,
        'sha256': digest,
        'training': {'seed': seed, 'dataset_sha256': manifest['batches_sha256'], 'max_depth': MAX_DEPTH,
                     'class_weight': CLASS_WEIGHT, 'train_rows': int(len(y_train)), 'sklearn_version': sklearn.__version__},
    }
    validate_tree(tree_json)
    out_tree.write_text(json.dumps(tree_json, indent=1) + '\n')
    out_rules.write_text(rules_markdown(model, tree_json, chosen))
    training = {'evidence_mode': CONTRACT['evidence_mode'], 'model_version': tree_json['model_version'], 'tree_sha256': digest,
                'abstain_cut_rule': f'lowest validation false reassurance rate with coverage at least {MIN_VALIDATION_COVERAGE}; '
                                    'ties go to higher coverage, then the lower cut',
                'chosen': chosen, 'candidates': table, 'validation_rows': int(len(y_validation)),
                'note': 'Validation farms only. Test and stress farms are reported by model/evaluate.py.'}
    out_training.write_text(json.dumps(training, indent=2) + '\n')
    return tree_json


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--out-dir', type=Path, help='write tree.json, tree_rules.md and training.json here instead')
    args = parser.parse_args(argv)
    if args.out_dir:
        args.out_dir.mkdir(parents=True, exist_ok=True)
        tree = train(args.out_dir / 'tree.json', args.out_dir / 'tree_rules.md', args.out_dir / 'training.json')
    else:
        tree = train()
    print(f'{tree["model_version"]}: {len(tree["nodes"])} nodes, abstain_cut {tree["abstain_cut"]}, sha256 {tree["sha256"]}')


if __name__ == '__main__':
    main(sys.argv[1:])
