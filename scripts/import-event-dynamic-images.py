"""Import dynamic (action) pictures for an event roster: python scripts/import-event-dynamic-images.py <event>.
For each player in scripts/event-portraits-<event>.json, finds a fut.gg item of that player that has a dynamic
picture and stores it as assets/footera/events/<event>/dynamic-raw/<id>.png (players without one are listed as missing)."""
import io, json, pathlib, re, sys, urllib.request
from PIL import Image

root = pathlib.Path(__file__).resolve().parents[1]
event = sys.argv[1]
roster = json.loads((root / f'scripts/event-portraits-{event}.json').read_text())
target = root / f'assets/footera/events/{event}/dynamic-raw'
target.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36'}
get = lambda url: urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read()

found = []
for player in roster:
    pid = player['id']
    try:
        page = get(f'https://www.fut.gg/players/{pid}/').decode('utf-8', 'ignore')
        items = sorted(set(re.findall(r'/27-(\d+)\.[0-9a-f]{20,}\.webp', page)) - {pid})
        best = None
        for item in items:
            d = json.loads(get(f'https://www.fut.gg/api/fut/player-item-definitions/27/{item}/'))['data']
            if d.get('hasDynamic') and d.get('basePlayerEaId') == int(pid) and (not best or d['overall'] > best['overall']):
                best = d
        if not best:
            print('MISSING', player['name'], pid, flush=True); continue
        image = Image.open(io.BytesIO(get('https://game-assets.fut.gg/' + best['imagePath']))).convert('RGBA')
        image.save(target / f'{pid}.png')
        print('DYNAMIC', player['name'], pid, best['eaId'], image.size, flush=True)
        found.append({**player, 'item': best['eaId'], 'source': 'https://game-assets.fut.gg/' + best['imagePath']})
    except Exception as error:
        print('ERROR', player['name'], pid, error, flush=True)
(target / 'sources.json').write_text(json.dumps(found, ensure_ascii=False, indent=2) + '\n')
