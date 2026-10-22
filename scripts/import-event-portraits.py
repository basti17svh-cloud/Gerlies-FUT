"""Import real transparent portraits for an event: python scripts/import-event-portraits.py <event>.
Reads scripts/event-portraits-<event>.json and writes assets/footera/events/<event>/portraits-raw/<id>.png."""
import concurrent.futures, hashlib, io, json, pathlib, sys, urllib.request
from PIL import Image

root = pathlib.Path(__file__).resolve().parents[1]
event = sys.argv[1]
roster = json.loads((root / f'scripts/event-portraits-{event}.json').read_text())
target = root / f'assets/footera/events/{event}/portraits-raw'
target.mkdir(parents=True, exist_ok=True)

def fetch(player):
    pid = player['id']
    urls = [f'https://cdn.futwiz.com/assets/img/fc{year}/faces/{pid}.png' for year in (27, 26, 25)]
    urls += [f'https://ratings-images-prod.pulse.ea.com/FC{year}/portraits/p{pid}.png' for year in (27, 26)]
    urls += [f'https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p{pid}.png?padding=0']
    errors = []
    for url in urls:
        try:
            raw = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=15).read()
            image = Image.open(io.BytesIO(raw)); image.load()
            assert image.width >= 100 and image.height >= 100 and len(raw) > 1500
            rgba = image.convert('RGBA')
            assert rgba.getchannel('A').getextrema() == (0, 255), 'portrait must be a transparent cutout'
            dest = target / f'{pid}.png'
            rgba.save(dest, format='PNG')
            print('PORTRAIT', player['name'], pid, image.size, url, flush=True)
            return {**player, 'source': url, 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()}
        except Exception as error:
            errors.append(f'{url}: {error}')
    print('MISSING', player['name'], pid, *errors, sep='\n  ', flush=True)
    return {**player, 'source': None}

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    imported = list(pool.map(fetch, roster))
(target / 'sources.json').write_text(json.dumps(imported, ensure_ascii=False, indent=2) + '\n')
