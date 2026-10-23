"""Import dynamic (action) pictures for an event roster: python scripts/import-event-dynamic-images.py <event>.
For each player in scripts/event-portraits-<event>.json, finds a fut.gg item of that player that has a dynamic
picture and stores it as assets/footera/events/<event>/dynamic-raw/<id>.png (players without one are listed as missing).
A player entry may list "games" (e.g. [27, 26]) to fall back to an earlier game's items, and "all": true to keep every
dynamic item as <id>-<game>-<item>.png so one can be picked by hand."""
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
        candidates = []
        for game in player.get('games', [27]):
            prefix = 'https://www.fut.gg/players' if game == 27 else f'https://www.fut.gg/{game}/players'
            try:
                page = get(f'{prefix}/{pid}/').decode('utf-8', 'ignore')
                items = sorted(set(re.findall(rf'/{game}-(\d+)\.[0-9a-f]{{20,}}\.webp', page)) - {pid})
            except Exception as error:
                # EA special item ids are the base id plus a multiple of 2^24, so they can be probed without the page
                print('PAGE', player['name'], game, error, '- probing item ids', flush=True)
                items = [str(int(pid) + k * 2 ** 24) for k in range(1, 40)]
            for item in items:
                try:
                    d = json.loads(get(f'https://www.fut.gg/api/fut/player-item-definitions/{game}/{item}/'))['data']
                except Exception as error:
                    if '404' not in str(error): print('ITEM', game, item, error, flush=True)
                    continue
                if d.get('hasDynamic') and d.get('basePlayerEaId') == int(pid):
                    candidates.append((game, d))
            if candidates and not player.get('all'):
                break
        if not candidates:
            print('MISSING', player['name'], pid, flush=True); continue
        keep = candidates if player.get('all') else [max(candidates, key=lambda c: c[1]['overall'])]
        for game, best in keep:
            image = Image.open(io.BytesIO(get('https://game-assets.fut.gg/' + best['imagePath']))).convert('RGBA')
            name = f'{pid}-{game}-{best["eaId"]}.png' if player.get('all') else f'{pid}.png'
            image.save(target / name)
            print('DYNAMIC', player['name'], pid, game, best['eaId'], best.get('overall'), (best.get('club') or {}).get('name') if isinstance(best.get('club'), dict) else best.get('club'), image.size, flush=True)
            found.append({**player, 'game': game, 'item': best['eaId'], 'file': name, 'overall': best.get('overall'),
                          'club': (best.get('club') or {}).get('name') if isinstance(best.get('club'), dict) else best.get('club'), 'source': 'https://game-assets.fut.gg/' + best['imagePath']})
    except Exception as error:
        print('ERROR', player['name'], pid, error, flush=True)
(target / 'sources.json').write_text(json.dumps(found, ensure_ascii=False, indent=2) + '\n')
