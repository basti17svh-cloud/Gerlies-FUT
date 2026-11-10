import csv,json,pathlib
rows={r['player_id']:r for r in csv.DictReader(open('assets/players-db.csv'))}
# Approved TOTW 9; poster preparation only, isolated from main.
picks=[
('246219','Khadija Shaw','ST',91,[1,2,1,1,0,1]),
('258980','Alessia Russo','ST',89,[1,2,1,1,0,1]),
('266928','Trinity Rodman','RW',89,[2,3,3,2,1,2]),
('212622','Joshua Kimmich','CDM',89,[1,2,1,1,1,1]),
('258310','Ann-Katrin Berger','GK',88,[1,1,1,2,0,1]),
('226271','Fabián Ruiz','CM',88,[2,4,2,2,1,2]),
('277179','Fermín López','CAM',87,[2,4,2,3,1,2]),
('264309','Arda Güler','CAM',86,[3,3,4,3,1,2]),
('227647','Maximilian Mittelstädt','LB',85,[2,3,2,2,2,2]),
('255303','Elia Caprile','GK',83,[3,3,3,4,1,3]),
('261478','Tasos Douvikas','ST',83,[4,6,5,4,2,4]),
('270728','Carlos Romero','LB',83,[3,4,3,3,3,3]),
('267276','Kayla Sharples','CB',83,[2,2,3,2,4,3]),
('276295','Thierno Barry','ST',82,[5,7,6,5,2,5]),
('272612','Brajan Gruda','RM',81,[3,4,6,4,2,3]),
('241736','Yann Aurel Bisseck','CB',81,[3,4,2,2,3,3]),
('76201','Ella Peddemors','CM',80,[4,7,5,5,3,4]),
('247782','Kasper Jørgensen','RB',78,[8,12,9,8,8,8]),
]
players=[]
for pid,name,pos,ovr,inc in picks:
 r=rows[pid]
 stats=[min(99,int(r[k])+n) for k,n in zip(['pace','shooting','passing','dribbling','defending','physic'],inc)]
 players.append({'names':list(dict.fromkeys([name,r['short_name'],r['long_name']])),'eaId':pid,'ovr':ovr,'position':pos,'stats':stats,'fallback':{
 'face':f'./assets/footera/totw/9/{pid}.png','gender':'female' if r['gender'].startswith('Women') else 'male','name':name,'fullName':r['long_name'],
 'ovr':int(r['overall']),'position':r['positions'].split(',')[0],'alt':'','team':r['club_name'],'league':r['league_name'],
 'nation':r['nationality_name'],'nationFlag':r['nation_flag_url'],'clubLogo':r['club_logo_url'],'teamId':r['club_team_id']}})
assert len(players)==18 and sum(p['fallback']['gender']=='female' for p in players)==6
assert len({p['fallback']['team'] for p in players})==18
assert all(players[i]['ovr']>=players[i+1]['ovr'] for i in range(17))
week={'id':9,'name':'Team of the Week 9','releaseDate':'2026-11-11','activeUntil':'18.11.2026 18:59','sourceStatus':'admin-approved','players':players}
pathlib.Path('scripts/totw9-week.json').write_text(json.dumps(week,ensure_ascii=False,indent=2))
pathlib.Path('scripts/totw-portraits-9.json').write_text(json.dumps([{'id':p['eaId'],'name':p['names'][0]} for p in players],ensure_ascii=False,indent=2))
app=pathlib.Path('footera-app.js');s=app.read_text()
assert 'const TOTW_WEEK_9=' not in s
s=s.replace('const TOTW_WEEKS=[','const TOTW_WEEK_9='+json.dumps(week,ensure_ascii=False,indent=2)+';\nconst TOTW_WEEKS=[')
s=s.replace('TOTW_WEEK_7,TOTW_WEEK_8];','TOTW_WEEK_7,TOTW_WEEK_8,TOTW_WEEK_9];')
app.write_text(s)
for p in players: print(p['names'][0],p['ovr'],p['stats'],p['fallback']['team'])
