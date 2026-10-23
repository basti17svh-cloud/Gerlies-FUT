"""One-off probe: list fut.gg items of each player and the image fields of items that have a dynamic picture."""
import json, re, sys, urllib.request
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36', 'Accept': '*/*'}
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read()
roster = json.load(open('scripts/event-portraits-halloween.json'))
first = True
for p in roster:
    pid = p['id']
    try:
        html = get(f'https://www.fut.gg/players/{pid}/').decode('utf-8', 'ignore')
    except Exception as e:
        print('PAGE', p['name'], e); continue
    items = sorted(set(re.findall(r'/27-(\d+)\.[0-9a-f]{20,}\.webp', html)))
    print('PLAYER', p['name'], pid, 'items', items)
    for item in items[:12]:
        try:
            d = json.loads(get(f'https://www.fut.gg/api/fut/player-item-definitions/27/{item}/'))['data']
        except Exception as e:
            print('  ITEM', item, e); continue
        imgs = {k: v for k, v in d.items() if isinstance(v, str) and re.search(r'image|path|dynamic|url', k, re.I)}
        print('  ITEM', item, 'ovr', d.get('overall'), 'rarity', d.get('rarityEaId'), 'hasDynamic', d.get('hasDynamic'), json.dumps(imgs)[:900])
        if d.get('hasDynamic') and first:
            first = False
            print('  FULLKEYS', sorted(d.keys()))
