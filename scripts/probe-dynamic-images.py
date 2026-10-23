"""One-off probe: which public sources serve dynamic (action) player images for a given EA id."""
import json, re, sys, urllib.request
ids = sys.argv[1:] or ['239053', '241651']
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36', 'Accept': '*/*'}
def get(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20)
        body = r.read()
        return r.status, r.headers.get('content-type'), body
    except Exception as e:
        return getattr(e, 'code', None), str(e)[:120], b''
for pid in ids:
    for url in [f'https://www.fut.gg/api/fut/player-item-definitions/27/{pid}/',
                f'https://www.fut.gg/api/fut/player-item-definitions/27/?eaId={pid}',
                f'https://www.fut.gg/players/{pid}/',
                f'https://www.futbin.com/27/player/{pid}',
                f'https://www.futwiz.com/en/fc27/player/x/{pid}',
                f'https://cdn.futwiz.com/assets/img/fc27/items/{pid}.png',
                f'https://cdn.futwiz.com/assets/img/fc27/dynamic/{pid}.png']:
        status, ctype, body = get(url)
        text = body[:200000].decode('utf-8', 'ignore')
        imgs = sorted(set(re.findall(r'https?://[^"\'\s)]+?(?:dynamic|action|bg|shadow|Animated|player-item)[^"\'\s)]*?\.(?:png|webp)', text)))[:12]
        print('PROBE', pid, status, ctype, len(body), url)
        for i in imgs: print('   IMG', i)
        if 'json' in str(ctype): print('   JSON', text[:1500])
