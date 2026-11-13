import json,pathlib,re
week=json.loads(pathlib.Path('scripts/totw9-week.json').read_text())
assert week['sourceStatus']=='admin-approved' and len(week['players'])==18
app=pathlib.Path('footera-app.js');s=app.read_text()
assert 'const TOTW_WEEK_9=' not in s
s=s.replace('const TOTW_WEEKS=[','const TOTW_WEEK_9='+json.dumps(week,ensure_ascii=False,indent=2)+';\nconst TOTW_WEEKS=[')
s=s.replace('TOTW_WEEK_7,TOTW_WEEK_8];','TOTW_WEEK_7,TOTW_WEEK_8,TOTW_WEEK_9];')
# The current master has asset revisions through 21388.
s=re.sub(r'const GFUT_BUILD="V\d+\.\d+";', 'const GFUT_BUILD="V21.389";',s)
s=re.sub(r'service-worker\.js\?v=\d+','service-worker.js?v=21389',s)
app.write_text(s)
p=pathlib.Path('index.html');s=p.read_text()
s=re.sub(r'Footera V\d+\.\d+','Footera V21.389',s)
s=re.sub(r'(id="buildBadge">)V\d+\.\d+',r'\g<1>V21.389',s)
s=re.sub(r'footera-app\.js\?v=\d+','footera-app.js?v=21389',s);p.write_text(s)
p=pathlib.Path('service-worker.js');s=p.read_text()
s=re.sub(r'const CACHE="[^"]+";', 'const CACHE="footera-v21-389-totw9";',s)
s=re.sub(r'footera-app\.js\?v=\d+','footera-app.js?v=21389',s)
portraits=','.join(json.dumps('./assets/footera/totw/9/'+p['eaId']+'.png') for p in week['players'])
s=s.replace('const SHELL=[','const SHELL=['+portraits+',');p.write_text(s)
pathlib.Path('scripts/totw-current.json').write_text(json.dumps({'week':9,'release':'2026-11-11','revision':1})+'\n')
