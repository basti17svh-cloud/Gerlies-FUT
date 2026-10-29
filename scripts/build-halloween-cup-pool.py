"""Freeze the full approved Team 1 roster for earned Halloween cup picks."""
import csv, json, subprocess
from pathlib import Path
root = Path(__file__).resolve().parent.parent
source = """const fs=require('fs'),vm=require('vm'),s=fs.readFileSync('footera-app.js','utf8');const a=s.indexOf('const HALLOWEEN_EVENT='),b=s.indexOf('\\n]};',a)+4,c={};vm.runInNewContext(s.slice(a,b)+';this.event=HALLOWEEN_EVENT',c);process.stdout.write(JSON.stringify(c.event));"""
ev=json.loads(subprocess.check_output(['node','-e',source],cwd=root))
with (root/'assets/players-db.csv').open() as f: rows=list(csv.DictReader(f))
byid={r['player_id']:r for r in rows}; teams={r['club_name']:r for r in rows if r['gender']=="Men's Football"}; out=[]
for p in ev['players']:
 r=byid[p['pid']]; t=teams[p['team']]
 b={'id':p['pid'],'name':p['name'],'fullName':r['long_name'],'ovr':int(r['overall']),'position':p['position'],'alt':p['alt'],'nation':p['nation'],'nationCode':r['nationality_id'],'nationFlag':r['nation_flag_url'],'team':p['team'],'teamId':t['club_team_id'],'clubLogo':t['club_logo_url'],'league':p.get('league',t['league_name']),'face':r['player_face_url'],'gender':'male','source':'fc27-open-data','playstyles':r['playstyles'],'playstylesPlus':r['playstyles_plus'],'skillMoves':int(r['skill_moves']),'weakFoot':int(r['weak_foot'])}
 for k,col in zip(['pac','sho','pas','dri','def','phy'],['pace','shooting','passing','dribbling','defending','physic']): b[k]=int(r[col])
 item={'pid':p['pid'],'variant':'special','eventType':'halloween','eventName':'HALLOWEEN','eventReleaseId':ev['id'],'displayRating':p['ovr'],'eventStats':p['stats'],'overridePosition':p['position'],'dynamicFace':p['dynamicFace'],'playstyleAdds':p.get('playstyleAdds',[]),'playstylePlusAdds':p.get('playstylePlusAdds',[]),'baseSnapshot':b,'tradeable':False,'rare':True,'evo':0,'evoStats':{}}
 option={'id':'halloween-team1:'+p['pid'],'item':item}
 q=lambda x:"'"+x.replace("'","''")+"'"
 out.append('('+q(p['pid'])+','+q(json.dumps(option,ensure_ascii=False,separators=(',',':')))+'::jsonb)')
assert len(out)==18 and len({p['pid'] for p in ev['players']})==18
(root/'online/footera-halloween-cup-pool-v21.297.sql').write_text('-- Fixed full Team 1 pool, generated from HALLOWEEN_EVENT and assets/players-db.csv.\ninsert into footera_private.halloween_cup_pool(pid,option) values\n'+',\n'.join(out)+'\non conflict(pid) do update set option=excluded.option;\n')
print('Generated',len(out),'cards')
