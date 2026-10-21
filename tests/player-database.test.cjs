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

test('players carry the name fans use, not their legal name',()=>{
 const{players}=load(),byId=new Map(players.map(p=>[p.id,p]));
 for(const[id,name,legal]of[['233419','Raphinha','Raphael Dias Belloli'],['231866','Rodri','Rodrigo Hernández Cascante'],['243812','Rodrygo','Rodrygo Silva de Goes'],['238794','Vini Jr.','Vinícius José de Oliveira Júnior']]){
  const p=byId.get(id);assert.ok(p,`${name} (${id}) is in the database`);
  assert.equal(p.name,name);assert.equal(p.fullName,legal,'the legal name stays available for search');
 }
});

test('the revision file matches the checked-in database, so installs refresh their offline copy',()=>{
 const{text}=load(),version=JSON.parse(fs.readFileSync(path.join(root,'assets','players-db-version.json'),'utf8'));
 assert.equal(version.revision,require('node:crypto').createHash('sha256').update(text).digest('hex').slice(0,16),'run scripts/build-player-db.cjs or rewrite the revision after editing the CSV');
 assert.equal(version.players,text.trim().split('\n').length-1);
 assert.match(html,/const DB_VERSION_URL="\.\/assets\/players-db-version\.json"/);
 const worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 assert.match(worker,/players-db\(\?:-version\\\.json\|\\\.csv\)/,'the service worker never answers the database from its own cache');
});

test('the database holds the current game, not the previous one',()=>{
 // drop-api.ea.com kept serving FC 26 after FC 27 came out: Lewandowski at Barcelona, Nkunku at Milan.
 const version=JSON.parse(fs.readFileSync(path.join(root,'assets','players-db-version.json'),'utf8'));
 const game=fs.readFileSync(path.join(root,'scripts','build-player-db.cjs'),'utf8').match(/const GAME='([^']+)'/)[1];
 assert.equal(version.game,game,'rebuild the database with scripts/build-player-db.cjs');
 const lewandowski=load().players.find(p=>p.id==='188545');
 assert.ok(lewandowski&&lewandowski.team!=='FC Barcelona','Lewandowski left Barcelona before FC 27 (he plays for Chicago Fire)');
 assert.equal(load().players.find(p=>p.id==='232411')?.team,'RB Leipzig','Nkunku plays for RB Leipzig (CLUB_OVERRIDES in the build script)');
});
