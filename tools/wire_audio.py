#!/usr/bin/env python3
"""Wire recorded Twi voice clips into the app.

Usage, from the repository root:

    python3 tools/wire_audio.py [recordings_folder]

recordings_folder defaults to ~/Desktop/sankofa-audio. Put one recording per message key in it,
named exactly <key>.m4a (the format a phone's voice recorder saves), for example band_red.m4a.
The keys to record, with the Twi text to read, are in that folder's RECORDING_LIST.md: the four
band_* keys, the three action_* keys, every reason_* key, and the question_* key of each of the
seven form steps. The result screen's Play button reads the band, its reasons and its action, in
that order; each form step's Play button reads that step's question.

What it writes:

- web/audio/tw/<key>.mp3 for every recording whose name is a key in web/contract.json: mono,
  22.05 kHz, 40 kbps MP3, with leading and trailing silence trimmed and loudness evened out, so
  a two-second clip is about 10 kB. A file whose name is not a contract key is reported and skipped.
- web/audio/index.json, listing for each contract language the keys that have a clip in
  web/audio/<lang>/. The app shows Play only for keys listed there (docs/contracts_v2.md, Audio).

Needs ffmpeg built with libmp3lame (`brew install ffmpeg` on a Mac). Running it again is safe:
clips are reconverted from their recordings, and clips already in web/audio/ stay listed.

After running it, three things before the pull request:

1. node --test tests/sw.test.mjs fails and prints the PRECACHE and CACHE_VERSION lines for
   web/sw.js. Paste them in, so installed phones fetch the new clips.
2. UPDATE_SIZES=1 python -m pytest tests/test_size.py refreshes evidence/sizes.json.
3. Run the app, open a result and a form step in Twi, and press Play.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LANGUAGE = 'tw'
TRIM_AND_LEVEL = ','.join([
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15',
    'areverse',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.25',
    'areverse',
    'loudnorm=I=-18:TP=-2',
])


def require_ffmpeg():
    if shutil.which('ffmpeg') is None:
        sys.exit('ffmpeg is not installed; install it (for example: brew install ffmpeg) and run again.')
    encoders = subprocess.run(['ffmpeg', '-hide_banner', '-encoders'], capture_output=True, text=True, check=True).stdout
    if 'libmp3lame' not in encoders:
        sys.exit('this ffmpeg has no MP3 encoder (libmp3lame); install a build that has it and run again.')


def convert(recording, target):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(recording), '-af', TRIM_AND_LEVEL,
                    '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '40k', str(target)], check=True)


def main():
    source = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path.home() / 'Desktop' / 'sankofa-audio'
    if not source.is_dir():
        sys.exit(f'no recordings folder at {source}')
    require_ffmpeg()
    contract = json.loads((ROOT / 'web/contract.json').read_text())
    keys = set(contract['message_keys'])
    out_dir = ROOT / 'web/audio' / LANGUAGE
    out_dir.mkdir(parents=True, exist_ok=True)
    converted, skipped = [], []
    for recording in sorted(source.glob('*.m4a')):
        if recording.stem not in keys:
            skipped.append(recording.name)
            continue
        convert(recording, out_dir / f'{recording.stem}.mp3')
        converted.append(recording.stem)
    index = {code: sorted(clip.stem for clip in (ROOT / 'web/audio' / code).glob('*.mp3') if clip.stem in keys)
             for code in contract['languages']}
    (ROOT / 'web/audio/index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    print(f'converted {len(converted)}: {" ".join(converted) or "none"}')
    print(f'skipped, not a contract key: {" ".join(skipped) or "none"}')
    print(f'web/audio/index.json now lists {len(index[LANGUAGE])} {LANGUAGE} clips')


if __name__ == '__main__':
    main()
