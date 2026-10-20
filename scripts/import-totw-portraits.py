"""Import real TOTW portraits for one week: python scripts/import-totw-portraits.py <week>."""
import concurrent.futures
import hashlib
import io
import json
import pathlib
import sys
import urllib.request
from PIL import Image

root = pathlib.Path(__file__).resolve().parents[1]
week = sys.argv[1]
roster = json.loads((root / f'scripts/totw-portraits-{week}.json').read_text())
target = root / f'assets/footera/totw/{week}'
target.mkdir(parents=True, exist_ok=True)

def fetch(player):
    pid = player['id']
    urls = [f'https://cdn.futwiz.com/assets/img/fc{year}/faces/{pid}.png' for year in (27, 26, 25)]
    urls += [f'https://ratings-images-prod.pulse.ea.com/FC{year}/portraits/p{pid}.png' for year in (27, 26)]
    urls += [f'https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p{pid}.png?padding=0']
    padded = pid.zfill(6)
    urls += [f'https://cdn.sofifa.net/players/{padded[:3]}/{padded[3:]}/{year}_120.png' for year in (27, 26)]
    errors = []
    for url in urls:
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            raw = urllib.request.urlopen(request, timeout=15).read()
            image = Image.open(io.BytesIO(raw))
            image.load()
            assert image.width >= 100 and image.height >= 100 and len(raw) > 1500
            rgba = image.convert('RGBA')
            alpha = rgba.getchannel('A')
            assert alpha.getextrema() == (0, 255), 'portrait must be a transparent cutout'
            assert alpha.getbbox(), 'empty portrait'
            destination = target / f'{pid}.png'
            rgba.save(destination, format='PNG')
            result = {**player, 'source': url, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'width': image.width, 'height': image.height}
            print('PORTRAIT', player['name'], pid, image.size, flush=True)
            return result
        except Exception as error:
            errors.append(f'{url}: {error}')
    raise RuntimeError(player['name'] + '\n' + '\n'.join(errors))

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    imported = list(pool.map(fetch, roster))
assert len(imported) == 18 and len({row['id'] for row in imported}) == 18
(target / 'sources.json').write_text(json.dumps(imported, ensure_ascii=False, indent=2) + '\n')
