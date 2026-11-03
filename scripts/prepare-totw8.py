# Builds the mixed TOTW_WEEK_8 (men and women, Basti 2026-11-03) from assets/players-db.csv plus the proposed Footera ratings.
import csv,json,pathlib
rows={r['player_id']:r for r in csv.DictReader(open('assets/players-db.csv'))}
picks=[
 ('230869','GK',87,[86,83,78,88,51,85]),
 ('267212','GK',86,[84,83,81,87,46,87]),
 ('235212','RB',91,[94,86,84,85,84,83]),
 ('240030','RB',87,[88,62,82,80,84,85]),
 ('258908','CB',84,[60,58,77,72,86,83]),
 ('236403','CB',85,[76,60,71,72,86,86]),
 ('198141','CB',82,[70,66,72,73,83,79]),
 ('234378','CDM',90,[75,80,88,84,87,86]),
 ('227095','CM',89,[83,87,86,89,74,76]),
 ('265898','CAM',90,[94,87,83,92,62,76]),
 ('257504','CAM',82,[83,76,79,85,42,60]),
 ('263620','CDM',82,[70,58,78,81,81,76]),
 ('252060','CM',78,[72,79,72,78,76,77]),
 ('277643','RW',93,[91,90,91,96,41,66]),
 ('260407','ST',83,[90,84,68,80,33,70]),
 ('70017','LW',80,[80,78,75,84,40,55]),
 ('243559','RW',84,[85,85,78,84,48,74]),
 ('264012','ST',90,[92,91,81,89,45,80]),
]
# Wahi plays for Nice on loan; the base row still lists Frankfurt.
club_override={'260407':rows['239093']}
players=[]
for pid,pos,ovr,stats in picks:
 r=rows[pid];club=club_override.get(pid,r)
 names=[r['short_name']]+([r['long_name']] if r['long_name']!=r['short_name'] else [])
 players.append({'names':names,'eaId':pid,'ovr':ovr,'position':pos,'stats':stats,'fallback':{
  'face':f'./assets/footera/totw/8/{pid}.png','gender':'female' if r['gender'].startswith('Women') else 'male','name':r['short_name'],'fullName':r['long_name'],
  'ovr':int(r['overall']),'position':r['positions'].split(',')[0],'alt':'','team':club['club_name'],'league':club['league_name'],
  'nation':r['nationality_name'],'nationFlag':r['nation_flag_url'],'clubLogo':club['club_logo_url'],'teamId':club['club_team_id']}})
week={'id':8,'name':'Team of the Week 8','releaseDate':'2026-11-04','activeUntil':'11.11.2026 18:59','sourceStatus':'pending-approval','players':players}
pathlib.Path('scripts/totw8-week.json').write_text(json.dumps(week,ensure_ascii=False,indent=2))
pathlib.Path('scripts/totw-portraits-8.json').write_text(json.dumps([{'id':p['eaId'],'name':p['names'][0]} for p in players],ensure_ascii=False,indent=2)+'\n')
