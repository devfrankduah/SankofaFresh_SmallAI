"""Turn a raw NASA POWER hourly CSV into web/weather.json: one row of daily means per day of the year.

Run from the repository root:  python -m data.build_weather --raw data/raw/power_6.6034_-0.7121_2025.csv
The fetch metadata (request URL, API version, date accessed) is read from the .meta.json file beside it.
"""
from __future__ import annotations

import argparse
import calendar
import csv
import io
import json
import math
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'web' / 'weather.json'
MAX_BYTES = 100_000
MISSING = -999.0
HOURS_PER_DAY = 24
# Wide enough for any inhabited place; values outside are a broken download, not weather.
PLAUSIBLE = {'RH2M': (0.0, 100.0), 'T2M': (-40.0, 50.0)}
CITATION = ("The data was obtained from National Aeronautics and Space Administration (NASA) Langley Research "
            "Center's Prediction Of Worldwide Energy Resources (POWER) project funded through the NASA Earth "
            "Science Division.")


def hourly_rows(raw_text: str) -> list[dict[str, str]]:
    marker = '-END HEADER-'
    if marker not in raw_text:
        raise ValueError('raw file has no POWER header; was it saved by data/fetch_power.py?')
    return list(csv.DictReader(io.StringIO(raw_text.split(marker, 1)[1].lstrip('\n'))))


def daily_means(rows: list[dict[str, str]], year: int) -> list[dict[str, Any]]:
    """Mean of the 24 hourly values for every day of the year, in day-of-year order."""
    days_in_year = 366 if calendar.isleap(year) else 365
    if len(rows) != days_in_year * HOURS_PER_DAY:
        raise ValueError(f'expected {days_in_year * HOURS_PER_DAY} hourly rows for {year}, got {len(rows)}')
    days: list[dict[str, Any]] = []
    for day_index in range(days_in_year):
        hours = rows[day_index * HOURS_PER_DAY:(day_index + 1) * HOURS_PER_DAY]
        first = hours[0]
        expected_date = (year, *divmod_day(year, day_index))
        if (int(first['YEAR']), int(first['MO']), int(first['DY'])) != expected_date:
            raise ValueError(f'hourly rows out of order at day {day_index + 1}')
        if [int(h['HR']) for h in hours] != list(range(HOURS_PER_DAY)):
            raise ValueError(f'day {day_index + 1} does not have hours 0 to 23')
        row: dict[str, Any] = {'day_of_year': day_index + 1}
        for variable, column in (('RH2M', 'rh2m_mean'), ('T2M', 't2m_mean')):
            values = [float(h[variable]) for h in hours]
            low, high = PLAUSIBLE[variable]
            bad = [v for v in values if v == MISSING or not math.isfinite(v) or not low <= v <= high]
            if bad:
                raise ValueError(f'day {day_index + 1} has missing or implausible {variable} values: {bad[:3]}')
            row[column] = round(sum(values) / HOURS_PER_DAY, 2)
        days.append(row)
    return days


def divmod_day(year: int, day_index: int) -> tuple[int, int]:
    """(month, day) for a zero-based day of the year."""
    month = 1
    while day_index >= calendar.monthrange(year, month)[1]:
        day_index -= calendar.monthrange(year, month)[1]
        month += 1
    return month, day_index + 1


def build(raw_path: Path) -> str:
    meta = json.loads(raw_path.with_suffix('.meta.json').read_text())
    days = daily_means(hourly_rows(raw_path.read_text()), meta['year'])
    header = {
        'source': f'NASA {meta["service"]} {meta["api_version"]}, MERRA-2, hourly T2M and RH2M, '
                  f'community {meta["community"]}, {meta["time_standard"]} time, accessed {meta["accessed"]}',
        'citation': CITATION,
        'request_url': meta['request_url'],
        'lat': meta['lat'],
        'lon': meta['lon'],
        'year': meta['year'],
    }
    # One day per line keeps the file small and its diffs readable.
    lines = ['{'] + [f'  {json.dumps(key)}: {json.dumps(value)},' for key, value in header.items()]
    lines.append('  "days": [')
    lines += [f'    {json.dumps(day)}{"," if i < len(days) - 1 else ""}' for i, day in enumerate(days)]
    lines += ['  ]', '}']
    return '\n'.join(lines) + '\n'


def summary(days: list[dict[str, Any]]) -> str:
    rh = [d['rh2m_mean'] for d in days]
    t = [d['t2m_mean'] for d in days]
    return (f'daily mean RH2M {min(rh)} to {max(rh)} percent (mean {sum(rh) / len(rh):.1f}); '
            f'daily mean T2M {min(t)} to {max(t)} C (mean {sum(t) / len(t):.1f})')


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--raw', type=Path, required=True, help='raw CSV saved by data/fetch_power.py')
    parser.add_argument('--out', type=Path, default=OUTPUT, help='output path (default web/weather.json)')
    args = parser.parse_args(argv)
    text = build(args.raw)
    size = len(text.encode())
    if size >= MAX_BYTES:
        raise SystemExit(f'weather.json would be {size} bytes, over the {MAX_BYTES} byte limit')
    args.out.write_text(text)
    print(f'Wrote {args.out} ({size} bytes): {summary(json.loads(text)["days"])}')


if __name__ == '__main__':
    main(sys.argv[1:])
