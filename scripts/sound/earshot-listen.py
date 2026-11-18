"""Listen to rendered Footera sounds with earshot and write a report.

Run with earshot's own Python (scripts/sound/hear.sh does this):
    earshot-python scripts/sound/earshot-listen.py DIR

DIR holds the WAVs and cues.json from render-game-sounds.cjs (or any folder
of audio files: then only `describe` runs). For each cue it runs, in one
process so the two models load once (~30 s):
  describe  what it sounds like in words, AudioSet labels, peak, brightness
  match     how well the cue's intended description fits, against near
            confusions (strong / plausible / weak / no match)
  measure   LUFS, true peak, envelope (no models)
Writes DIR/earshot-report.md (read this) and DIR/earshot-report.json.
Nothing here changes the game.
"""
import json
import sys
from pathlib import Path


def short(obj, limit=700):
    text = obj if isinstance(obj, str) else json.dumps(obj, ensure_ascii=False, default=str)
    return text if len(text) <= limit else text[:limit] + ' ...'


def summary(result):
    if isinstance(result, dict):
        for key in ('summary', 'text', 'verdict_text'):
            if isinstance(result.get(key), str):
                return result[key]
    return short(result)


def main():
    if len(sys.argv) < 2:
        sys.exit('usage: earshot-listen.py DIR [id ...]')
    folder = Path(sys.argv[1])
    only = set(sys.argv[2:])
    cues_file = folder / 'cues.json'
    if cues_file.exists():
        cues = json.loads(cues_file.read_text())['cues']
    else:
        cues = [{'id': p.stem, 'file': p.name} for p in sorted(folder.iterdir())
                if p.suffix.lower() in ('.wav', '.mp3', '.ogg', '.flac', '.m4a')]
    if only:
        cues = [c for c in cues if c['id'] in only]
    if not cues:
        sys.exit(f'no sounds in {folder}')

    from earshot import api  # models load lazily and stay warm here

    rows, lines = [], ['# earshot: Footera sounds', '',
                       f'Folder: `{folder}`. Verdicts: strong > plausible > weak > no match.', '']
    for cue in cues:
        path = str(folder / cue['file'])
        row = {'id': cue['id'], 'file': cue['file']}
        try:
            row['describe'] = api.describe(path)
        except Exception as e:  # keep going: one bad file must not hide the rest
            row['describe_error'] = str(e)
        if cue.get('expect'):
            try:
                row['match'] = api.match(path, cue['expect'], alts=cue.get('alts') or [])
            except Exception as e:
                row['match_error'] = str(e)
        try:
            row['measure'] = api.measure(path)
        except Exception as e:
            row['measure_error'] = str(e)
        rows.append(row)

        lines.append(f"## {cue['id']}")
        if cue.get('expect'):
            lines.append(f"- should sound like: {cue['expect']} (not: {', '.join(cue.get('alts') or [])})")
        if 'match' in row:
            lines.append(f"- match: {summary(row['match'])}")
        if 'describe' in row:
            lines.append(f"- describe: {summary(row['describe'])}")
        for key in ('describe_error', 'match_error', 'measure_error'):
            if key in row:
                lines.append(f'- {key}: {row[key]}')
        lines.append('')
        print(f"{cue['id']}: {summary(row.get('match') or row.get('describe') or {})[:200]}", flush=True)

    (folder / 'earshot-report.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False, default=str) + '\n')
    (folder / 'earshot-report.md').write_text('\n'.join(lines) + '\n')
    print(f'wrote {folder / "earshot-report.md"}')


if __name__ == '__main__':
    main()
