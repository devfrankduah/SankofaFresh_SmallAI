"""AC05: tree.json is under 250 KB and the whole app under the 1 MB target, measured live.

This test writes nothing. python -m model.sizes regenerates evidence/sizes.json when evidence is refreshed.
"""
from model.sizes import APP_TARGET_BYTES, TREE_LIMIT_BYTES, measure


def test_tree_is_under_250_kb():
    sizes = measure()
    assert sizes['tree_json_bytes'] is not None, 'web/tree.json is missing'
    assert sizes['tree_json_bytes'] < TREE_LIMIT_BYTES


def test_whole_app_is_under_the_1_mb_target():
    assert measure()['web_total_bytes'] < APP_TARGET_BYTES
