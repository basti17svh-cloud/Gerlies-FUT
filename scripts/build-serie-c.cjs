/* Build assets/players-serie-c.csv: Italy's Serie C 2026-27 (60 clubs, three groups) with the real squads.
   node scripts/build-serie-c.cjs   (offline; reads data/serie-c-squads.json and assets/players-db.csv)

   Squads come from Wikipedia + Wikidata (scripts/serie-c-collect.cjs collects them in GitHub Actions).
   EA's FC 27 has no Serie C, so there are no official ratings: names, clubs, nations, shirt numbers and the
   rough role (GK/DF/MF/FW) are real, the ratings are Footera estimates (role + age + club level, stable per
   player). Exception: Ronaldinho at Ravenna uses the values of his FC 27 card exactly.
   build-player-db.cjs appends this file to players-db.csv, so the weekly EA refresh keeps the Serie C. */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const SRC=path.join(ROOT,'data','serie-c-squads.json');
const OUT=path.join(ROOT,'assets','players-serie-c.csv');
const LEAGUE='Serie C';
// Footera's own ids for the Serie C start here, far above every EA id, so no EA portrait lookup can match them.
const ID_BASE=900000000;
const COLUMNS=['player_id','common_name','short_name','long_name','positions','overall','pace','shooting','passing','dribbling','defending','physic',
 'preferred_foot','weak_foot','skill_moves','nationality_name','nationality_id','nation_flag_url','club_name','club_team_id','club_logo_url',
 'league_name','player_face_url','playstyles','playstyles_plus','gender'];
// Names fans use in Footera (the Wikipedia club list says "Inter Milan U23").
const CLUB_NAMES={'Inter Milan U23':'Inter U23'};
// U23 sides wear the parent club's crest; Wikipedia has no own logo for some of them.
const PARENT_CREST={'Atalanta U23':'Atalanta','Inter U23':'Inter','Juventus Next Gen':'Juventus'};
// Clubs that played Serie B (or higher) recently field stronger squads; U23 sides are young.
const CLUB_LEVEL={Bari:3,Spezia:3,Salernitana:3,Cosenza:2,Pescara:2,Reggiana:2,Cittadella:2,Catania:2,'Union Brescia':2,Crotone:1,Perugia:1,
 Ternana:1,Vicenza:1,Ravenna:1,Foggia:1,'Audace Cerignola':1,Lecco:0,Novara:0,Triestina:0,'Juventus Next Gen':-1,'Atalanta U23':-1,'Inter Milan U23':-1};
const NATIONS={ALB:'Albania',ALG:'Algeria',ARG:'Argentina',AUS:'Australia',AUT:'Austria',BEL:'Belgium',BFA:'Burkina Faso',BRA:'Brazil',BUL:'Bulgaria',
 CAN:'Canada',CGO:'Congo',CHE:'Switzerland',SUI:'Switzerland',CIV:"Côte d'Ivoire",CMR:'Cameroon',CRO:'Croatia',HRV:'Croatia',CUB:'Cuba',CZE:'Czech Republic',
 DEN:'Denmark',DNK:'Denmark',DEU:'Germany',GER:'Germany',DOM:'Dominican Republic',DRC:'Congo DR',COD:'Congo DR',ENG:'England',EQG:'Equatorial Guinea',
 ERI:'Eritrea',ESP:'Spain',EST:'Estonia',FIN:'Finland',FRA:'France',GAB:'Gabon',GAM:'Gambia',GMB:'Gambia',GRE:'Greece',GHA:'Ghana',GUI:'Guinea',
 HUN:'Hungary',IRL:'Republic of Ireland',ISL:'Iceland',ITA:'Italy',KOS:'Kosovo',KVX:'Kosovo',LAT:'Latvia',LVA:'Latvia',LIT:'Lithuania',LTU:'Lithuania',
 MAR:'Morocco',MDA:'Moldova',MLI:'Mali',MLT:'Malta',NED:'Holland',NLD:'Holland',NGA:'Nigeria',NGR:'Nigeria',NZL:'New Zealand',POL:'Poland',
 POR:'Portugal',PRT:'Portugal',ROM:'Romania',ROU:'Romania',RUS:'Russia',SEN:'Senegal',SMR:'San Marino',SRB:'Serbia',SVN:'Slovenia',TOG:'Togo',
 TUN:'Tunisia',TUR:'Turkey',UKR:'Ukraine',URU:'Uruguay',URY:'Uruguay',USA:'United States',VEN:'Venezuela'};
// Wikidata's position labels -> card positions.
const WD_POS={'centre-back':'CB','full-back':'FB','right-back':'RB','left-back':'LB','wing half':'CM','winger':'W','attacking midfielder':'CAM',
 'defensive midfielder':'CDM','centre-forward':'ST','striker':'ST','goalkeeper':'GK'};
const ROLE={GK:'GK',P:'GK',DF:'DF',D:'DF',MF:'MF',C:'MF',FW:'FW',A:'FW'};
// Typical gap between each face stat and the overall, read from EA's Serie B and 3. Liga players.
const SHAPE={ST:[4,-1,-12,-1,-35,1],RM:[12,-6,-6,2,-26,-6],LM:[10,-8,-5,1,-27,-8],CAM:[5,-4,-2,2,-22,-8],CB:[-4,-31,-17,-13,0,4],CM:[3,-7,-1,1,-6,-1],
 GK:[0,-1,-2,2,-33,-1],CDM:[-2,-15,-6,-2,-2,2],LB:[6,-20,-7,-2,-4,-3],RB:[7,-20,-8,-2,-4,-1],RW:[12,-4,-5,3,-33,-13],LW:[8,-6,-4,2,-30,-13]};
const ALT={ST:[],RW:['RM'],LW:['LM'],RM:['RW'],LM:['LW'],CAM:['CM'],CM:['CDM'],CDM:['CM'],CB:[],RB:['RWB'],LB:['LWB'],GK:[]};
const RONALDINHO={positions:'CAM,LW',overall:66,pace:36,shooting:66,passing:76,dribbling:82,defending:26,physic:55,preferred_foot:'Right',weak_foot:4,
 skill_moves:5,player_face_url:'./assets/footera/serie-c/ronaldinho.webp',playstyles:'Trickster, Technical, Inventive, Dead Ball',long_name:'Ronaldo de Assis Moreira'};

function hash(s){let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)>>>0}return h>>>0}
const rnd=(seed,n)=>hash(seed)%n;
const clean=s=>String(s||'').replace(/<[^>]*>|\{\{[^}]*\}\}|'''?|\[\[|\]\]/g,'').replace(/\s+/g,' ').trim();
const cell=v=>{const t=String(v??'').replace(/[\r\n]+/g,' ');return /[",]/.test(t)?`"${t.replace(/"/g,'""')}"`:t};
function age(dob){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(dob||'');if(!m)return null;const d=new Date('2026-11-15');let a=d.getFullYear()-m[1];if(d.getMonth()+1<+m[2]||d.getMonth()+1===+m[2]&&d.getDate()<+m[3])a--;return a}
function position(p,seed){
 const role=ROLE[String(p.pos||'').toUpperCase()]||'MF',no=Number(String(p.no||'').replace(/\D/g,''))||0;
 const wd=(p.wdPos||[]).map(x=>WD_POS[x]).filter(Boolean);
 if(role==='GK')return'GK';
 const side=no===3||no%2===1?'L':'R';
 if(role==='DF'){
  if(wd.includes('CB'))return'CB';if(wd.includes('RB'))return'RB';if(wd.includes('LB'))return'LB';
  if(wd.includes('FB'))return side+'B';if(no===2)return'RB';if(no===3)return'LB';
  const r=rnd(seed+'df',4);return r<2?'CB':r===2?'RB':'LB';
 }
 if(role==='FW'){
  if(wd.includes('W'))return side+'W';if(no===9||wd.includes('ST'))return'ST';if(no===7)return'RW';if(no===11)return'LW';
  const r=rnd(seed+'fw',5);return r<3?'ST':r===3?'RW':'LW';
 }
 if(wd.includes('CAM')||no===10)return'CAM';if(wd.includes('CDM')||no===4)return'CDM';if(wd.includes('W'))return side+'M';if(no===7)return'RM';if(no===11)return'LM';
 const r=rnd(seed+'mf',8);return['CM','CM','CM','CDM','CAM','RM','LM','CM'][r];
}
function rating(p,club,seed){
 const a=age(p.dob);let ovr=59+(CLUB_LEVEL[club]||0)+rnd(seed+'ovr',9)-4;
 if(a!=null)ovr+=a<19?-5:a<21?-3:a<23?-1:a<=30?1:a<=33?0:-2;
 if(p.qid)ovr+=1; // players with their own Wikipedia article usually have more experience
 return Math.max(50,Math.min(68,ovr));
}
function stats(pos,ovr,seed){
 return(SHAPE[pos]||SHAPE.CM).map((d,i)=>Math.max(20,Math.min(85,ovr+d+rnd(seed+'s'+i,7)-3)));
}
function nationLookup(){
 const db=fs.readFileSync(path.join(ROOT,'assets','players-db.csv'),'utf8').split('\n');const head=db[0].split(',');
 const iClub=head.indexOf('club_name'),iLogo=head.indexOf('club_logo_url'),iName=head.indexOf('nationality_name'),iId=head.indexOf('nationality_id'),iFlag=head.indexOf('nation_flag_url');const out={},logos={};
 const csvRow=line=>{const o=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===','&&!q){o.push(cur);cur=''}else cur+=c}o.push(cur);return o};
 for(const line of db.slice(1)){if(!line)continue;const r=csvRow(line);if(r[iName]&&!out[r[iName]])out[r[iName]]={id:r[iId],flag:r[iFlag]};if(r[iClub]&&r[iLogo]&&!logos[r[iClub]])logos[r[iClub]]=r[iLogo]}
 return {nations:out,logos};
}
function build(){
 const src=JSON.parse(fs.readFileSync(SRC,'utf8')),{nations,logos}=nationLookup(),rows=[],ids=new Set(),missingNations=new Set();
 src.clubs.forEach((c,ci)=>{
  const club=CLUB_NAMES[c.club]||c.club,teamId=String(990000+ci+1);
  const seen=new Set();
  // Italic shirt numbers mark youth players only registered for the first team; the cap keeps U23 lists sane.
  const players=c.players.filter(p=>!/''/.test(p.no||'')&&clean(p.name)).slice(0,32);
  for(const p of players){
   const name=clean(p.name);if(seen.has(name))continue;seen.add(name);
   const seed=`${club}|${name}`;let id=ID_BASE+hash(seed)%99999999;while(ids.has(id))id++;ids.add(id);
   const code=String(p.nat||'').replace(/[^A-Za-z]/g,'').toUpperCase(),nationName=NATIONS[code]||(p.cit&&p.cit[0])||'Italy';
   if(!NATIONS[code])missingNations.add(code);
   const nation=nations[nationName]||{id:'',flag:''};
   const pos=position(p,seed),ovr=rating(p,club,seed),[pac,sho,pas,dri,def,phy]=stats(pos,ovr,seed);
   let row={player_id:id,common_name:name,short_name:name,long_name:name,positions:[pos,...(ALT[pos]||[])].join(','),overall:ovr,pace:pac,shooting:sho,
    passing:pas,dribbling:dri,defending:def,physic:phy,preferred_foot:pos[0]==='L'&&pos!=='LM'?'Left':rnd(seed+'foot',5)===0?'Left':'Right',
    weak_foot:2+rnd(seed+'wf',3),skill_moves:pos==='GK'?1:/W|M$|CAM/.test(pos)?2+rnd(seed+'sm',3):1+rnd(seed+'sm',3),
    nationality_name:nationName,nationality_id:nation.id,nation_flag_url:nation.flag,club_name:club,club_team_id:teamId,club_logo_url:c.logo||logos[PARENT_CREST[club]]||'',
    league_name:LEAGUE,player_face_url:'',playstyles:'',playstyles_plus:'',gender:"Men's Football"};
   if(name==='Ronaldinho'&&club==='Ravenna')row={...row,...RONALDINHO,player_id:900010010};
   rows.push(row);
  }
 });
 if(!rows.some(r=>r.common_name==='Ronaldinho'&&r.club_name==='Ravenna'))throw new Error('Ronaldinho is missing at Ravenna');
 if(new Set(rows.map(r=>r.player_id)).size!==rows.length)throw new Error('duplicate ids');
 const csv=[COLUMNS.join(','),...rows.map(r=>COLUMNS.map(k=>cell(r[k])).join(','))].join('\n')+'\n';
 fs.writeFileSync(OUT,csv);
 console.log(`Wrote ${rows.length} Serie C players from ${src.clubs.length} clubs`+(missingNations.size?`; unknown nation codes: ${[...missingNations].join(' ')}`:''));
}
// --merge also swaps the Serie C rows inside the checked-in players-db.csv (without a new EA download).
function merge(){
 const db=path.join(ROOT,'assets','players-db.csv'),lines=fs.readFileSync(db,'utf8').trim().split('\n');
 const ea=lines.slice(1).filter(l=>Number(l.slice(0,l.indexOf(',')))<ID_BASE),serieC=fs.readFileSync(OUT,'utf8').trim().split('\n').slice(1);
 const csv=[lines[0],...ea,...serieC].join('\n')+'\n';fs.writeFileSync(db,csv);
 const vPath=path.join(ROOT,'assets','players-db-version.json'),v=JSON.parse(fs.readFileSync(vPath,'utf8'));
 fs.writeFileSync(vPath,JSON.stringify({...v,revision:require('crypto').createHash('sha256').update(csv).digest('hex').slice(0,16),players:ea.length+serieC.length})+'\n');
 console.log(`players-db.csv: ${ea.length} EA + ${serieC.length} Serie C players`);
}
if(require.main===module){build();if(process.argv.includes('--merge'))merge()}
module.exports={build,merge,OUT};
