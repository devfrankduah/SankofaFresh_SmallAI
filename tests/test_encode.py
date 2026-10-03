"""model/contract.py against the shared fixtures. tests/test_encode_parity.mjs holds web/features.js to the
same expected values, so passing both means Python and JavaScript encode identically."""
import copy
import json
from pathlib import Path

import pytest

from model.contract import CONTRACT, encode, is_allowed_value

FIXTURES = Path(__file__).resolve().parent / 'fixtures'
INPUTS = {field['name']: field for field in CONTRACT['inputs']}


def fixture(name):
    return json.loads((FIXTURES / name).read_text())


def tree_for(spec):
    if spec is None:
        return None
    tree = fixture(spec['base'])
    tree['feature_ranges'].update(spec.get('feature_ranges', {}))
    return tree


def fixture_cases():
    for name in ['demo_batches.json', 'out_of_range.json']:
        data = fixture(name)
        for case in data['cases']:
            expected = {key: case['expected'][key] for key in ('features', 'abstain_reason')}
            yield pytest.param(case['inputs'], data['weather_table'], None, expected, id=f'{name} {case["id"]}')
    for case in fixture('encode_cases.json')['cases']:
        yield pytest.param(case['inputs'], case['weather_table'], case['tree'], case['expected'], id=case['id'])


@pytest.mark.parametrize('inputs, table_name, tree_spec, expected', list(fixture_cases()))
def test_encode_matches_fixture(inputs, table_name, tree_spec, expected):
    assert encode(inputs, fixture(table_name), tree_for(tree_spec)).as_dict() == expected


def test_feature_order_comes_from_the_contract():
    reordered = copy.deepcopy(CONTRACT)
    reordered['features'][0], reordered['features'][1] = reordered['features'][1], reordered['features'][0]
    data = fixture('demo_batches.json')
    table = fixture(data['weather_table'])
    original = encode(data['cases'][1]['inputs'], table).features
    swapped = encode(data['cases'][1]['inputs'], table, contract=reordered).features
    assert swapped == [original[1], original[0], *original[2:]]


def test_tree_with_different_feature_names_is_a_build_error():
    tree = fixture('sample_tree.json')
    tree['feature_names'] = list(reversed(tree['feature_names']))
    data = fixture('demo_batches.json')
    with pytest.raises(ValueError, match='feature_names'):
        encode(data['cases'][0]['inputs'], fixture(data['weather_table']), tree)


@pytest.mark.parametrize('break_table, message', [
    (lambda table: table['days'].pop(), '365 or 366'),
    (lambda table: table['days'][10].update(rh2m_mean=None), 'finite rh2m_mean'),
    (lambda table: table['days'][0].update(day_of_year=True), 'day_of_year'),
    (lambda table: table['days'][3].update(t2m_mean=float('nan')), 'finite t2m_mean')])
def test_malformed_weather_table_is_a_build_error(break_table, message):
    table = fixture('weather_sample.json')
    break_table(table)
    with pytest.raises(ValueError, match=message):
        encode(fixture('demo_batches.json')['cases'][0]['inputs'], table)


@pytest.mark.parametrize('value, allowed', [
    (0, True), (180, True), (181, False), (-1, False), (True, False), (12.0, True), (12.5, False),
    ('12', False), (float('inf'), False), (10 ** 400, False)])
def test_integer_rule(value, allowed):
    assert is_allowed_value(INPUTS['days_stored'], value) is allowed
