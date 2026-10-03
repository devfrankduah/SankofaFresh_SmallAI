"""Feature encoding and input abstention rules (spec 5.2, and 5.3 rules 1 and 2), driven by web/contract.json.

web/features.js is the browser twin of this module. tests/test_encode_parity.mjs and tests/test_encode.py
hold both to the same fixtures, so any change here needs the same change there.
"""
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Mapping, Sequence

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / 'web' / 'contract.json'
# [0-9], not \d: Python's \d matches non-ASCII digits. date.fromisoformat rejects them too, but the contract
# is ASCII-only in both languages and shouldn't depend on that.
ISO_DATE = re.compile(r'[0-9]{4}-[0-9]{2}-[0-9]{2}')
WEATHER_AGGREGATES = ('mean', 'max')


def load_contract(path: Path = CONTRACT_PATH) -> dict[str, Any]:
    return json.loads(path.read_text())


CONTRACT = load_contract()


@dataclass(frozen=True)
class EncodeResult:
    """A feature vector in contract order, or the reason the check abstains with not_sure."""
    features: list[float] | None
    abstain_reason: str | None

    def as_dict(self) -> dict[str, Any]:
        return {'features': self.features, 'abstain_reason': self.abstain_reason}


def rule_reason(rule_id: str, contract: Mapping[str, Any] = CONTRACT) -> str:
    return next(rule['reason'] for rule in contract['abstention']['rules'] if rule['id'] == rule_id)


def parse_iso_date(value: Any) -> date | None:
    """A real calendar date written YYYY-MM-DD, or None."""
    if not isinstance(value, str) or not ISO_DATE.fullmatch(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def is_allowed_value(field: Mapping[str, Any], value: Any) -> bool:
    """True when a value other than "don't know" is allowed for this contract input."""
    if field['type'] == 'choice':
        return isinstance(value, str) and value in field['values']
    if field['type'] == 'integer':
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return False
        # JSON has a single number type, so 12.0 is the same answer as 12; JavaScript can't tell them apart.
        if isinstance(value, float) and not (math.isfinite(value) and value.is_integer()):
            return False
        return field['min'] <= value <= field['max']
    if field['type'] == 'date':
        return parse_iso_date(value) is not None
    raise ValueError(f'unknown input type {field["type"]!r} in contract')


def validated_days(weather: Any, contract: Mapping[str, Any] = CONTRACT) -> Sequence[Mapping[str, Any]]:
    """The daily rows of a weather.json table. A malformed table is a build error, so it raises."""
    days = weather.get('days') if isinstance(weather, Mapping) else None
    if not isinstance(days, list) or len(days) not in (365, 366):
        raise ValueError('weather table must have a days list with 365 or 366 rows')
    columns = contract['weather_window']['columns'].values()
    for position, row in enumerate(days):
        day_of_year = row.get('day_of_year') if isinstance(row, Mapping) else None
        if isinstance(day_of_year, bool) or day_of_year != position + 1:
            raise ValueError(f'weather row {position} must have day_of_year {position + 1}')
        for column in columns:
            value = row.get(column)
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f'weather row {position} has no finite {column}')
    return days


def sequential_mean(values: Sequence[float]) -> float:
    # Plain left-to-right addition, the same order web/features.js uses, so both languages get the same
    # last bit. math.fsum or numpy would round differently.
    total = 0.0
    for value in values:
        total += value
    return total / len(values)


def weather_features(storage_start: str, days_stored: int | float, weather: Any,
                     contract: Mapping[str, Any] = CONTRACT) -> dict[str, float]:
    """Weather feature values for the window ending on storage_start plus days_stored.

    Raises OverflowError when the check date falls after 9999-12-31.
    """
    days = validated_days(weather, contract)
    window = contract['weather_window']
    start = parse_iso_date(storage_start)
    if start is None:
        raise ValueError(f'storage_start {storage_start!r} is not a YYYY-MM-DD date')
    check_date = start + timedelta(days=int(days_stored))
    end_index = (check_date.timetuple().tm_yday - 1) % len(days)
    rows = [days[(end_index - offset) % len(days)] for offset in range(window['days'] - 1, -1, -1)]
    values: dict[str, float] = {}
    for feature in contract['features']:
        if feature['source'] != 'weather':
            continue
        series = [row[window['columns'][feature['variable']]] for row in rows]
        if feature['aggregate'] == 'mean':
            values[feature['name']] = sequential_mean(series)
        elif feature['aggregate'] == 'max':
            values[feature['name']] = max(series)
        else:
            raise ValueError(f'unknown weather aggregate {feature["aggregate"]!r} in contract')
    return values


def encode(inputs: Any, weather: Any, tree: Mapping[str, Any] | None = None,
           contract: Mapping[str, Any] = CONTRACT) -> EncodeResult:
    """Apply abstention rule 1, then rule 2, then build the feature vector in contract order.

    Pass the loaded tree.json once a tree exists, so rule 2 also checks its feature_ranges.
    """
    out_of_range = EncodeResult(None, rule_reason('out_of_range', contract))
    if not isinstance(inputs, Mapping):
        return out_of_range
    fields = {field['name']: field for field in contract['inputs']}
    dont_know = contract['dont_know_value']
    if any(field['allows_dont_know'] and inputs.get(name) == dont_know for name, field in fields.items()):
        return EncodeResult(None, rule_reason('dont_know', contract))
    if set(inputs) != set(fields) or not all(is_allowed_value(fields[name], inputs[name]) for name in fields):
        return out_of_range
    window = contract['weather_window']
    try:
        weather_values = weather_features(inputs[window['start_input']], inputs[window['days_input']], weather, contract)
    except OverflowError:
        return out_of_range
    vector: list[float] = []
    for feature in contract['features']:
        if feature['source'] == 'weather':
            vector.append(weather_values[feature['name']])
        elif feature['encoding'] == 'integer':
            vector.append(int(inputs[feature['input']]))
        elif feature['encoding'] == 'map':
            vector.append(feature['map'][inputs[feature['input']]])
        else:
            raise ValueError(f'unknown encoding {feature["encoding"]!r} in contract')
    if tree is not None:
        names = [feature['name'] for feature in contract['features']]
        if tree.get('feature_names') != names:
            raise ValueError('tree.json feature_names do not match the contract feature order')
        for name, value in zip(names, vector):
            low, high = tree['feature_ranges'][name]
            if not low <= value <= high:
                return out_of_range
    return EncodeResult(vector, None)
