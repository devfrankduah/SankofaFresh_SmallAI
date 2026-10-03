"""Validation-only depth sweep for the tree (follow-up to #10). Writes evidence/depth_sweep.json.

Run from the repository root:  python -m model.depth_sweep
Each depth is trained on the train farms exactly as model/train.py does, with abstain_cut tuned on the validation
farms by the same rule. Test and stress farms are never read here, so the depth is chosen before any test result.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from model.bands import band
from model.contract import CONTRACT
from model.evaluate import metrics
from model.train import candidate_cuts, choose_cut, fit, leaf_values, load_rows, matrix, score

ROOT = Path(__file__).resolve().parents[1]
SWEEP_PATH = ROOT / 'evidence' / 'depth_sweep.json'
DEPTHS = (3, 4, 5, 6)
# The original depth; other depths may lose at most MACRO_F1_TOLERANCE of its validation macro F1.
REFERENCE_DEPTH = 4
MIN_COVERAGE = 0.85
MACRO_F1_TOLERANCE = 0.01
CLASSES = CONTRACT['classes']
FEATURES = [feature['name'] for feature in CONTRACT['features']]


def sweep_row(depth: int, X_train: Any, y_train: Any, X_validation: Any, y_validation: Any, seed: int) -> dict[str, Any]:
    model = fit(X_train, y_train, seed, max_depth=depth)
    values = leaf_values(model)
    probabilities = model.predict_proba(X_validation)
    chosen = choose_cut([score(probabilities, y_validation, cut) for cut in candidate_cuts(values)])
    predicted = [band(list(p), chosen['abstain_cut']) for p in probabilities]
    used = sorted({FEATURES[f] for f in model.tree_.feature if f >= 0}, key=FEATURES.index)
    return {'max_depth': depth, 'abstain_cut': chosen['abstain_cut'], 'leaves': len(values),
            **metrics([CLASSES[int(label)] for label in y_validation], predicted), 'features_used': used}


def choose_depth(rows: list[dict[str, Any]]) -> dict[str, Any]:
    reference = next(row for row in rows if row['max_depth'] == REFERENCE_DEPTH)['macro_f1']
    allowed = [row for row in rows if row['coverage'] >= MIN_COVERAGE and row['macro_f1'] >= reference - MACRO_F1_TOLERANCE]
    return min(allowed, key=lambda row: (row['false_reassurance_rate'], row['max_depth']))


def main(argv: list[str]) -> None:
    rows = load_rows()
    seed = int(json.loads((ROOT / 'data' / 'manifest.json').read_text())['seed'])
    X_train, y_train = matrix(rows, 'train')
    X_validation, y_validation = matrix(rows, 'validation')
    table = [sweep_row(depth, X_train, y_train, X_validation, y_validation, seed) for depth in DEPTHS]
    chosen = choose_depth(table)
    result = {
        'evidence_mode': 'SYNTHETIC_DEMO',
        'data': 'validation farms only; test and season stress farms are not read',
        'rule': (f'lowest validation false reassurance rate among depths with coverage at least {MIN_COVERAGE} and macro F1 '
                 f'no more than {MACRO_F1_TOLERANCE} below depth {REFERENCE_DEPTH}; ties go to the smaller depth. Each depth tunes '
                 'abstain_cut with the model/train.py rule.'),
        'chosen_max_depth': chosen['max_depth'],
        'depths': table,
    }
    SWEEP_PATH.write_text(json.dumps(result, indent=2) + '\n')
    for row in table:
        print(f'depth {row["max_depth"]}: cut {row["abstain_cut"]}, coverage {row["coverage"]:.3f}, false reassurance '
              f'{row["false_reassurance_rate"]:.4f}, macro F1 {row["macro_f1"]:.4f}, red recall {row["red_recall"]:.3f}, '
              f'leaves {row["leaves"]}, uses {", ".join(row["features_used"])}')
    print(f'chosen max_depth: {chosen["max_depth"]}')


if __name__ == '__main__':
    main(sys.argv[1:])
