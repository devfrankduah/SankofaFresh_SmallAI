"""Check a tree.json object against docs/contracts_v2.md, the same rules web/tree.js enforces in checkStructure.

model/train.py runs this on its own output before writing it, and the tests run it on the committed files.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from typing import Any, Mapping, Sequence

import numpy as np

from model.contract import CONTRACT

PROBABILITY_SUM_TOLERANCE = 1e-9


def nodes_sha256(nodes: list[dict[str, Any]]) -> str:
    return hashlib.sha256(json.dumps(nodes, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_tree(tree: Mapping[str, Any], contract: Mapping[str, Any] = CONTRACT) -> None:
    """Raise ValueError naming the first problem; return None when the tree is valid."""
    def require(condition: bool, message: str) -> None:
        if not condition:
            raise ValueError(message)

    names = [feature['name'] for feature in contract['features']]
    require(tree.get('schema_version') == 2, 'schema_version must be 2')
    require(tree.get('evidence_mode') == contract['evidence_mode'], 'evidence_mode must match the contract')
    require(isinstance(tree.get('model_version'), str) and bool(re.fullmatch(r'tree-v2-\w+', tree['model_version'])),
            'model_version must look like tree-v2-<id>')
    require(tree.get('feature_names') == names, 'feature_names must be the contract features in contract order')
    require(tree.get('classes') == contract['classes'], 'classes must be the contract classes in contract order')
    require(is_number(tree.get('abstain_cut')) and 0 < tree['abstain_cut'] <= 1, 'abstain_cut must be above 0 and at most 1')
    ranges = tree.get('feature_ranges')
    require(isinstance(ranges, Mapping) and set(ranges) == set(names), 'feature_ranges must cover every feature')
    for name in names:
        low_high = ranges[name]
        require(isinstance(low_high, list) and len(low_high) == 2 and all(map(is_number, low_high)) and low_high[0] <= low_high[1],
                f'feature_ranges.{name} must be [low, high]')
    nodes = tree.get('nodes')
    require(isinstance(nodes, list) and len(nodes) > 0, 'nodes must be a non-empty list')
    for position, node in enumerate(nodes):
        require(isinstance(node, Mapping) and node.get('id') == position, f'node {position} must have id {position}')
        if 'value' in node:
            value = node['value']
            require(set(node) == {'id', 'value'}, f'leaf {position} must have only id and value')
            require(isinstance(value, list) and len(value) == len(contract['classes']), f'leaf {position} needs one probability per class')
            require(all(isinstance(p, float) and math.isfinite(p) and 0 <= p <= 1 for p in value),
                    f'leaf {position} probabilities must be floats from 0 to 1')
            require(abs(sum(value) - 1) < PROBABILITY_SUM_TOLERANCE, f'leaf {position} probabilities must sum to 1')
        else:
            require(set(node) == {'id', 'feature', 'threshold', 'left', 'right'}, f'split {position} has the wrong fields')
            require(type(node['feature']) is int and 0 <= node['feature'] < len(names), f'split {position} names no feature')
            # The JS hash rebuild prints thresholds as Python floats, so they must be floats here too.
            require(isinstance(node['threshold'], float) and math.isfinite(node['threshold']), f'split {position} needs a float threshold')
            require(all(type(node[side]) is int and 0 < node[side] < len(nodes) for side in ('left', 'right')),
                    f'split {position} children must be later nodes')
    seen: list[int] = []
    stack = [0]
    while stack:
        node = nodes[stack.pop()]
        seen.append(node['id'])
        if 'value' not in node:
            stack += [node['left'], node['right']]
    require(sorted(seen) == list(range(len(nodes))), 'every node must be reachable from the root exactly once')
    require(tree.get('sha256') == nodes_sha256(nodes), 'sha256 does not match the canonical nodes')


def leaf_for(tree: Mapping[str, Any], features: Sequence[float]) -> Mapping[str, Any]:
    """The leaf a feature vector reaches, walking tree.json the way web/tree.js does (float32 input, x <= threshold)."""
    node = tree['nodes'][0]
    while 'value' not in node:
        node = tree['nodes'][node['left'] if np.float32(features[node['feature']]) <= node['threshold'] else node['right']]
    return node
