"""Import POTM item portraits: python scripts/import-potm-portraits.py
Reads scripts/potm-portraits.json and writes assets/footera/events/potm/<folder>/<file> for every
missing portrait, plus <folder>/sources.json. Existing portraits are kept untouched."""
import hashlib, io, json, pathlib, urllib.request
from PIL import Image

root = pathlib.Path(__file__).resolve().parents[1]
base = root / 'assets/footera/events/potm'
rows = json.loads((root / 'scripts/potm-portraits.json').read_text())

def fetch(row):
    item, pid = row['itemId'], row['pid']
    urls = [f'https://cdn.futbin.com/content/fifa27/img/players/p{item}.png',
            f'https://cdn.futwiz.com/assets/img/fc27/faces/{pid}.png']
    errors = []
    for url in urls:
        try:
            raw = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=20).read()
            image = Image.open(io.BytesIO(raw)); image.load()
            assert image.width >= 200 and image.height >= 200, f'too small {image.size}'
            rgba = image.convert('RGBA')
            assert rgba.getchannel('A').getextrema()[0] == 0, 'portrait must be a transparent cutout'
            return rgba, url
        except Exception as error:
            errors.append(f'{url}: {error}')
    raise SystemExit('MISSING ' + row['name'] + '\n  ' + '\n  '.join(errors))

for folder in sorted({r['folder'] for r in rows}):
    target = base / folder; target.mkdir(parents=True, exist_ok=True)
    sources_file = target / 'sources.json'
    sources = json.loads(sources_file.read_text()) if sources_file.exists() else {'images': []}
    known = {img['asset'] for img in sources.get('images', [])}
    for row in (r for r in rows if r['folder'] == folder):
        dest = target / row['file']
        if dest.exists():
            continue
        image, url = fetch(row)
        image.save(dest, format='PNG', optimize=True)
        print('PORTRAIT', row['name'], image.size, url, flush=True)
        sources['images'] = [i for i in sources.get('images', []) if i['asset'] != row['file']]
        sources['images'].append({'name': dest.stem, 'itemId': row['itemId'], 'source': url, 'asset': row['file'], 'bytes': dest.stat().st_size,
                                  'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
    sources_file.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n')
