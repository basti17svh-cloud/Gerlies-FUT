import csv,json,unicodedata,pathlib
root=pathlib.Path('.')
def norm(v): return ''.join(c for c in unicodedata.normalize('NFD',v.lower()) if not unicodedata.combining(c))
names=['Gregor Kobel','Robin Roefs','Gabriel','Leonardo Balerdi','Rodrigo Guth','Joe Scally','Tiago Araújo','Scott McTominay','Douglas Luiz','Sebastian Szymański','Andrej Kramarić','Álex Berenguer','Abdellah Ouazane','Niclas Füllkrug','Rômulo','Evanilson','Óscar Aranda','Brynjólfur Willumsson']
with open('assets/players-db.csv') as f:
 rows=list(csv.DictReader(f))
print('HEADERS',list(rows[0]),flush=True)
out={}
for name in names:
 terms=norm(name).split()
 hits=[r for r in rows if all(t in norm(' '.join(str(v) for k,v in r.items() if 'name' in k.lower())) for t in terms)]
 out[name]=hits
 print(name,json.dumps(hits,ensure_ascii=False),flush=True)
pathlib.Path('scripts/totw7-base-rows.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
