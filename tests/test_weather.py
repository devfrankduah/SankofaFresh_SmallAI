"""web/weather.json: the format both encoders read, plausible values, and a reproducible build from the raw CSV."""
import calendar
import json
from pathlib import Path

from data.build_weather import MAX_BYTES, PLAUSIBLE, build
from model.contract import validated_days

ROOT = Path(__file__).resolve().parents[1]
WEATHER_PATH = ROOT / 'web' / 'weather.json'
WEATHER = json.loads(WEATHER_PATH.read_text())


def raw_path():
    path = ROOT / 'data' / 'raw' / f'power_{WEATHER["lat"]:.4f}_{WEATHER["lon"]:.4f}_{WEATHER["year"]}.csv'
    assert path.is_file(), f'{path} must be committed so the build works offline'
    return path


def test_weather_has_one_row_per_day_of_its_year():
    days = validated_days(WEATHER)
    assert len(days) == (366 if calendar.isleap(WEATHER['year']) else 365)


def test_weather_is_small_and_records_its_source():
    assert WEATHER_PATH.stat().st_size < MAX_BYTES
    assert WEATHER['request_url'].startswith('https://power.larc.nasa.gov/api/temporal/hourly/point?')
    assert 'NASA Earth Science Division' in WEATHER['citation']
    assert {'lat', 'lon', 'year', 'source'} <= set(WEATHER)


def test_weather_values_are_plausible():
    for day in WEATHER['days']:
        assert PLAUSIBLE['RH2M'][0] <= day['rh2m_mean'] <= PLAUSIBLE['RH2M'][1], day
        assert PLAUSIBLE['T2M'][0] <= day['t2m_mean'] <= PLAUSIBLE['T2M'][1], day


def test_weather_rebuilds_byte_for_byte_from_the_committed_raw_csv():
    assert build(raw_path()) == WEATHER_PATH.read_text()
