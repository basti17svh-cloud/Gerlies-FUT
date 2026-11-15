const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Serie C 2026-27: real squads from Wikipedia (EA's FC 27 has no Serie C), built by scripts/build-serie-c.cjs.
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
let cached;
function load(){
 if(cached)return cached;
 const ctx={badges:JSON.parse(fs.readFileSync(path.join(root,'assets','badge-manifest.json'),'utf8'))};
 vm.createContext(ctx);vm.runInContext(code+'\nVERIFIED_BADGES=badges;',ctx);
 const text=fs.readFileSync(path.join(root,'assets','players-db.csv'),'utf8');
 const players=vm.runInContext('(text)=>parseCSV(text).map(normCSV).filter(p=>p.id&&p.name&&p.ovr)',ctx)(text);
 return cached={players,serieC:players.filter(p=>p.league==='Serie C')};
}

test('all 60 Serie C clubs are in the player database as their own league',()=>{
 const{serieC}=load(),own=fs.readFileSync(path.join(root,'assets','players-serie-c.csv'),'utf8').trim().split('\n').length-1;
 assert.equal(serieC.length,own,'every row of players-serie-c.csv stays in the Serie C (no club name pulls it into another league)');
 const clubs=new Set(serieC.map(p=>p.team));
 assert.equal(clubs.size,60);
 for(const club of['Ravenna','Bari','Spezia','Salernitana','Catania','Juventus Next Gen','Inter U23','Atalanta U23'])assert.ok(clubs.has(club),club);
 for(const p of serieC){
  assert.ok(Number(p.id)>=900000000,`${p.name} uses a Footera id, never an EA id`);
  assert.ok(p.ovr>=50&&p.ovr<=68,`${p.name} ${p.ovr}`);
  assert.ok(p.position&&p.nation,`${p.name} has position and nation`);
 }
});

test('Ronaldinho plays for Ravenna with the values of his FC 27 card',()=>{
 const{serieC}=load(),r=serieC.find(p=>p.name==='Ronaldinho');
 assert.ok(r);assert.equal(r.team,'Ravenna');assert.equal(r.nation,'Brazil');
 assert.deepEqual([r.ovr,r.position,r.pac,r.sho,r.pas,r.dri,r.def,r.phy],[66,'CAM',36,66,76,82,26,55]);
 assert.equal(r.face,'./assets/footera/serie-c/ronaldinho.webp');
 assert.ok(fs.statSync(path.join(root,'assets','footera','serie-c','ronaldinho.webp')).size>10000);
});

test('the weekly EA refresh keeps the Serie C',()=>{
 const builder=fs.readFileSync(path.join(root,'scripts','build-player-db.cjs'),'utf8');
 assert.match(builder,/players-serie-c\.csv/);
});

test('Serie C cards never look up EA portraits by their Footera id',()=>{
 assert.match(html,/Number\(v\)<900000000/);
});

test('the revision file counts the Serie C players too',()=>{
 const version=JSON.parse(fs.readFileSync(path.join(root,'assets','players-db-version.json'),'utf8'));
 const own=fs.readFileSync(path.join(root,'assets','players-serie-c.csv'),'utf8').trim().split('\n').length-1;
 assert.ok(version.players>=own+10000,`${version.players} players listed`);
});
