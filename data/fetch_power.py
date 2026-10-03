"""Fetch one year of hourly NASA POWER T2M and RH2M for a point and save the raw CSV under data/raw/.

Run from the repository root:  python -m data.fetch_power --lat 6.6034 --lon -0.7121 --year 2025
Coordinates are arguments on purpose: the demo location is a team decision recorded in issue #1.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date
from pathlib import Path
from urllib.parse import urlencode

import requests

API = 'https://power.larc.nasa.gov/api/temporal/hourly/point'
RAW_DIR = Path(__file__).resolve().parent / 'raw'
FIRST_HOURLY_YEAR = 2001
ATTEMPTS = 3
TIMEOUT_SECONDS = 180


def coordinate(value: float) -> str:
    return f'{value:.4f}'


def request_url(lat: float, lon: float, year: int) -> str:
    query = {'parameters': 'T2M,RH2M', 'community': 'AG', 'longitude': coordinate(lon), 'latitude': coordinate(lat),
             'start': f'{year}0101', 'end': f'{year}1231', 'format': 'CSV', 'time-standard': 'LST'}
    return f'{API}?{urlencode(query, safe=",")}'


def raw_path(lat: float, lon: float, year: int) -> Path:
    return RAW_DIR / f'power_{coordinate(lat)}_{coordinate(lon)}_{year}.csv'


def fetch(url: str) -> str:
    """GET the CSV, retrying transient failures; the API is slow for a full hourly year."""
    for attempt in range(1, ATTEMPTS + 1):
        try:
            response = requests.get(url, timeout=TIMEOUT_SECONDS)
        except requests.RequestException as error:
            failure = f'request failed: {error}'
        else:
            if response.status_code == 200 and response.text.startswith('-BEGIN HEADER-'):
                return response.text
            failure = f'HTTP {response.status_code}: {response.text[:300]}'
        if attempt < ATTEMPTS:
            time.sleep(5 * attempt)
    raise RuntimeError(f'NASA POWER {failure}')


def api_version(lat: float, lon: float, year: int) -> str:
    """The POWER API version, from a one-day JSON request; the CSV header doesn't carry it."""
    query = {'parameters': 'T2M', 'community': 'AG', 'longitude': coordinate(lon), 'latitude': coordinate(lat),
             'start': f'{year}0101', 'end': f'{year}0101', 'format': 'JSON', 'time-standard': 'LST'}
    try:
        response = requests.get(f'{API}?{urlencode(query, safe=",")}', timeout=60)
        return str(response.json()['header']['api']['version'])
    except (requests.RequestException, ValueError, KeyError, TypeError):
        return 'unknown'


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--lat', type=float, required=True, help='latitude in decimal degrees')
    parser.add_argument('--lon', type=float, required=True, help='longitude in decimal degrees')
    parser.add_argument('--year', type=int, default=2025, help='calendar year (default 2025)')
    args = parser.parse_args(argv)
    if not -90 <= args.lat <= 90 or not -180 <= args.lon <= 180:
        parser.error('latitude must be within -90 to 90 and longitude within -180 to 180')
    if not FIRST_HOURLY_YEAR <= args.year < date.today().year:
        parser.error(f'year must be a complete year from {FIRST_HOURLY_YEAR} to {date.today().year - 1}')
    return args


def main(argv: list[str]) -> None:
    args = parse_args(argv)
    url = request_url(args.lat, args.lon, args.year)
    print(f'Request URL: {url}', flush=True)
    text = fetch(url)
    path = raw_path(args.lat, args.lon, args.year)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    # POWER asks references to give the service, its version and the date accessed.
    meta = {'request_url': url, 'service': 'POWER Hourly API', 'api_version': api_version(args.lat, args.lon, args.year),
            'accessed': date.today().isoformat(), 'lat': float(coordinate(args.lat)), 'lon': float(coordinate(args.lon)),
            'year': args.year, 'time_standard': 'LST', 'community': 'AG'}
    path.with_suffix('.meta.json').write_text(json.dumps(meta, indent=2) + '\n')
    print(f'Saved {path.relative_to(Path.cwd()) if path.is_relative_to(Path.cwd()) else path} ({len(text)} bytes)')


if __name__ == '__main__':
    main(sys.argv[1:])
