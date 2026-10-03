"""Result bands (spec 5.3 rule 3) and the humidity-only baseline (spec 7), for training and evaluation.

band() must agree with predict() in web/tree.js: the winner is the FIRST class with the highest probability
(numpy argmax), and the result is not_sure only when that probability is strictly below abstain_cut.
tests/test_parity.mjs checks the two against each other on every held-out row.
"""
from __future__ import annotations

from typing import Any, Mapping, Sequence

from model.contract import CONTRACT

# Spec section 7: red when the 14-day mean RH is above 80 percent, otherwise green. The 80 percent figure comes
# from the ochratoxin A storage literature (little OTA at 80 percent RH, significant at 87 and 95 percent).
BASELINE_FEATURE = 'rh14_mean'
BASELINE_RED_ABOVE = 80.0


def winning_index(probabilities: Sequence[float]) -> int:
    """Index of the first highest probability, the same tie rule as numpy argmax and tree.js."""
    if not probabilities:
        raise ValueError('probabilities must not be empty')
    best = 0
    for index in range(1, len(probabilities)):
        if probabilities[index] > probabilities[best]:
            best = index
    return best


def band(probabilities: Sequence[float], abstain_cut: float, contract: Mapping[str, Any] = CONTRACT) -> str:
    """The class band, or the abstention band when the winning probability is strictly below abstain_cut."""
    classes = contract['classes']
    if len(probabilities) != len(classes):
        raise ValueError(f'expected {len(classes)} probabilities, got {len(probabilities)}')
    best = winning_index(probabilities)
    return contract['abstention']['band'] if probabilities[best] < abstain_cut else classes[best]


def humidity_baseline(features: Sequence[float], contract: Mapping[str, Any] = CONTRACT) -> str:
    """The one-variable comparator from spec 7. It never abstains and never says amber."""
    names = [feature['name'] for feature in contract['features']]
    return 'red' if features[names.index(BASELINE_FEATURE)] > BASELINE_RED_ABOVE else 'green'
