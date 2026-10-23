"""Find FC27 players (base 80-88, men) for whom fut.gg lists an item with an EA dynamic picture.
Writes scripts/dynamic-candidates.json: [{id, name, ovr, club, league, position, item}]."""
import concurrent.futures, csv, json, pathlib, re, urllib.request
root = pathlib.Path(__file__).resolve().parents[1]
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36'}
get = lambda url: urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read()
rows = [r for r in csv.DictReader(open(root / 'assets/players-db.csv', encoding='utf-8'))
        if 80 <= int(r['overall']) <= 88 and 'female' not in r['gender'].lower()]
def check(r):
    pid = r['player_id']
    try:
        page = get(f'https://www.fut.gg/players/{pid}/').decode('utf-8', 'ignore')
        for item in sorted(set(re.findall(r'/27-(\d+)\.[0-9a-f]{20,}\.webp', page)) - {pid}):
            d = json.loads(get(f'https://www.fut.gg/api/fut/player-item-definitions/27/{item}/'))['data']
            if d.get('hasDynamic') and d.get('basePlayerEaId') == int(pid):
                return {'id': pid, 'name': r['common_name'] or r['short_name'], 'ovr': int(r['overall']), 'club': r['club_name'],
                        'league': r['league_name'], 'position': r['positions'].split(',')[0].strip(), 'item': d['eaId']}
    except Exception as error:
        print('ERROR', pid, error, flush=True)
    return None
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    found = [x for x in pool.map(check, rows) if x]
found.sort(key=lambda x: -x['ovr'])
print('CHECKED', len(rows), 'DYNAMIC', len(found))
for x in found: print('DYN', x)
(root / 'scripts/dynamic-candidates.json').write_text(json.dumps(found, ensure_ascii=False, indent=1) + '\n')
