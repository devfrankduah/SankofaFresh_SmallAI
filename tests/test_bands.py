"""model/bands.py: the band rule tree.js uses, and the spec 7 humidity-only baseline."""
import json
from pathlib import Path

import pytest

from model.bands import band, humidity_baseline, winning_index
from model.contract import CONTRACT

FIXTURES = Path(__file__).resolve().parent / 'fixtures'
RH14_MEAN = [f['name'] for f in CONTRACT['features']].index('rh14_mean')


@pytest.mark.parametrize('probabilities, cut, expected', [
    ([0.8, 0.15, 0.05], 0.6, 'green'),
    ([0.1, 0.3, 0.6], 0.6, 'red'),            # equal to the cut is not below it
    ([0.1, 0.35, 0.55], 0.6, 'not_sure'),
    ([0.2, 0.5999999999999999, 0.2000000000000001], 0.6, 'not_sure'),
    ([0.45, 0.1, 0.45], 0.4, 'green'),        # a tie goes to the first class, like numpy argmax
    ([0.1, 0.45, 0.45], 0.4, 'amber'),
    ([1.0, 0.0, 0.0], 1.0, 'green'),
])
def test_band_rule(probabilities, cut, expected):
    assert band(probabilities, cut) == expected


def test_band_rejects_the_wrong_number_of_classes():
    with pytest.raises(ValueError):
        band([0.5, 0.5], 0.6)


def test_winning_index_matches_numpy_argmax():
    numpy = pytest.importorskip('numpy')
    rng = numpy.random.default_rng(7)
    for _ in range(500):
        probabilities = rng.choice([0.0, 0.25, 0.5, 0.75, 1.0], size=3).tolist()
        assert winning_index(probabilities) == int(numpy.argmax(probabilities))


def test_sample_tree_leaves():
    tree = json.loads((FIXTURES / 'sample_tree.json').read_text())
    leaves = [node['value'] for node in tree['nodes'] if 'value' in node]
    assert [band(value, tree['abstain_cut']) for value in leaves] == ['green', 'red']


@pytest.mark.parametrize('rh14_mean, expected', [(80.0, 'green'), (80.00000000000001, 'red'), (59.9, 'green'), (95.0, 'red')])
def test_humidity_baseline(rh14_mean, expected):
    features = [0.0] * len(CONTRACT['features'])
    features[RH14_MEAN] = rh14_mean
    assert humidity_baseline(features) == expected


def test_demo_fixture_baselines_agree():
    for case in json.loads((FIXTURES / 'demo_batches.json').read_text())['cases']:
        if case['expected']['features'] is not None:
            assert humidity_baseline(case['expected']['features']) == case['expected']['baseline_band'], case['id']
