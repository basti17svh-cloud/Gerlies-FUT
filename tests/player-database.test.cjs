const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// The game loads its players from assets/players-db.csv (built from EA's ratings by scripts/build-player-db.cjs).
const root=path.join(__dirname,'..');
const html=require('./helpers/app-html.cjs')(root);
const section=(a,b)=>{const i=html.indexOf(a);assert.ok(i>=0,a);return html.slice(i,html.indexOf(b,i))};
const line=re=>html.match(re)[0];
const code=[
 line(/^const DB_SOURCES=\[[\s\S]*?\];$/m),line(/^const DB_MIN_PLAYERS=.*$/m),
 line(/^function normalizeKey\(.*$/m),line(/^function rarityOf\(.*$/m),
 section('const API_SPORTS_LEAGUE_IDS=','async function loadVerifiedBadges('),
 section('function first(raw,','function keyNameTeam('),
 section('const TOP5_CLUB_LEAGUES=','async function fetchText(')
].join('\n');
const csvPath=path.join(root,'assets','players-db.csv');

let cached;
function load(){
 if(cached)return cached;
 const ctx={badges:JSON.parse(fs.readFileSync(path.join(root,'assets','badge-manifest.json'),'utf8'))};
 vm.createContext(ctx);vm.runInContext(code+'\nVERIFIED_BADGES=badges;',ctx);
 const text=fs.readFileSync(csvPath,'utf8');
 const players=vm.runInContext('(text)=>parseCSV(text).map(normCSV).filter(p=>p.id&&p.name&&p.ovr)',ctx)(text);
 return cached={ctx,players,text};
}

test('the game reads its own player database first',()=>{
 const{ctx}=load();
 const sources=vm.runInContext('DB_SOURCES',ctx);
 assert.equal(sources[0].url,'./assets/players-db.csv');
 assert.ok(sources.every(s=>!/mzafram2001/.test(s.url)),'the deleted third-party file is no longer used');
});

test('the checked-in database passes the startup check',()=>{
 const{ctx,players}=load();
 const result=ctx.validateDatabase(players);
 assert.equal(result.ok,true,result.reason);
 assert.ok(players.length>=10000);
 assert.equal(new Set(players.map(p=>p.id)).size,players.length,'player ids are unique');
});

test('real players keep the EA ids that saved clubs point to',()=>{
 const{players}=load(),byId=new Map(players.map(p=>[p.id,p]));
 for(const[id,needle]of[['231747','Mbapp'],['239085','Haaland'],['277643','Yamal']]){
  const p=byId.get(id);assert.ok(p,`${needle} (${id}) is in the database`);
  assert.match(p.name,new RegExp(needle));assert.ok(p.ovr>=85);
  for(const k of['pac','sho','pas','dri','def','phy'])assert.ok(p[k]>=20&&p[k]<=99,`${needle} ${k}=${p[k]}`);
  assert.ok(p.team&&p.nation&&p.position,`${needle} has club, nation and position`);
  assert.match(p.face,/^https:\/\/ratings-images-prod\.pulse\.ea\.com\//);
 }
});

test('top leagues and real club names come through',()=>{
 const{players}=load(),men=players.filter(p=>!/women/i.test(p.gender));
 const counts={};for(const p of men)counts[p.league]=(counts[p.league]||0)+1;
 for(const league of['Bundesliga','Premier League','LALIGA EA SPORTS','Serie A','Ligue 1'])assert.ok((counts[league]||0)>=300,`${league}: ${counts[league]||0}`);
 assert.equal(players.filter(p=>['Lombardia FC','Milano FC'].includes(p.team)).length,0,'licence names are replaced by the real clubs');
 assert.ok(players.some(p=>/women/i.test(p.gender)),"women's players are included");
});
