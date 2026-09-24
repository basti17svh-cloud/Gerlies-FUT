const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const iconCode=html.slice(html.indexOf('const MID_ICON_DATA='),html.indexOf('function randomMidIconBase()'));
const nationsCode=html.slice(html.indexOf('const COUNTRY_CODES='),html.indexOf('function flagEmoji('));
const chemCode=html.slice(html.indexOf('function chemThreshold('),html.indexOf('function slotHTML('));
const normalizeCode=html.match(/^function normalizeKey\(v\).*$/m)?.[0];
const hashCode=html.match(/^function hashNum\(v\).*$/m)?.[0];
assert.ok(iconCode&&nationsCode&&chemCode&&normalizeCode&&hashCode);

function setup(){
 const formation=Array.from({length:11},()=>({p:'CM'}));
 const ctx={formation,currentFormation(){return formation},displayBase:item=>item,
  inPosition:(p,position)=>[p.position,...String(p.alt||'').split(',')].includes(position),
  squadItems(){return[]},itemRating:()=>0};
 vm.createContext(ctx);
 vm.runInContext([normalizeCode,hashCode,iconCode,nationsCode,chemCode].join('\n'),ctx);
 return{ctx,formation,api:vm.runInContext('({MID_ICON_BASES,ICON_NATIONS,squadChemistry,playerChem,chemNationKey,nationLabel})',ctx)}
}
function ordinary(position='CM',nation='Germany',league='Bundesliga',team='Eintracht Frankfurt'){
 return{position,nation,league,team};
}
function line(...players){return players.concat(Array(Math.max(0,11-players.length)).fill(null))}

test('every current Icon has a nation, including separate British football nations',()=>{
 const{api}=setup();
 assert.equal(api.MID_ICON_BASES.length,134);
 assert.deepEqual(Array.from(api.MID_ICON_BASES.filter(icon=>!icon.nation),icon=>icon.name),[]);
 const byName=name=>api.MID_ICON_BASES.find(icon=>icon.name===name);
 assert.equal(byName('George Best').nation,'Northern Ireland');
 assert.equal(byName('Gareth Bale').nation,'Wales');
 assert.equal(byName('Kenny Dalglish').nation,'Scotland');
 assert.equal(byName('Karl-Heinz Rummenigge').nation,'Germany');
 assert.equal(api.nationLabel('Wales'),'Wales');
 assert.notEqual(api.chemNationKey('England'),api.chemNationKey('Scotland'));
});

test('Icon receives three chemistry in position, none out of position or on the bench',()=>{
 const{api,formation}=setup(),icon=api.MID_ICON_BASES.find(i=>i.name==='Pelé');
 formation[0].p='CAM';
 assert.equal(api.playerChem(0,line(icon)),3);
 formation[0].p='CB';
 assert.equal(api.playerChem(0,line(icon)),0);
 const bench=line(null);bench[11]=icon;
 assert.equal(api.playerChem(11,bench),0);
});

test('Icon contributes one league link to every league, and no artificial shared club',()=>{
 const{api,formation}=setup();
 const icon=api.MID_ICON_BASES.find(i=>i.name==='Christine Sinclair');
 formation[0].p='ST';
 const german=ordinary('CM','Germany','Bundesliga','Eintracht Frankfurt');
 const french=ordinary('CM','France','Bundesliga','Borussia Dortmund');
 assert.equal(api.playerChem(1,line(null,german,french)),0);
 assert.equal(api.playerChem(1,line(icon,german,french)),1);
 assert.equal(api.playerChem(2,line(icon,german,french)),1);
 assert.equal(api.playerChem(0,line(icon,german,french)),3);
 const twoIcons=[icon,api.MID_ICON_BASES.find(i=>i.name==='Pelé')];
 formation[1].p='CAM';
 assert.equal(api.playerChem(0,line(...twoIcons)),3);
 assert.equal(api.playerChem(1,line(...twoIcons)),3);
});

test('Icon adds exactly one link to its own nation, and wrong position removes both contributions',()=>{
 const{api,formation}=setup(),icon=api.MID_ICON_BASES.find(i=>i.name==='Karl-Heinz Rummenigge');
 formation[0].p='ST';
 const german=ordinary('CM','Germany','Bundesliga','Eintracht Frankfurt');
 assert.equal(api.playerChem(1,line(icon,german)),1);
 const nonGerman=ordinary('CM','France','Ligue 1','Paris SG');
 assert.equal(api.playerChem(1,line(icon,nonGerman)),0);
 formation[0].p='CB';
 assert.equal(api.playerChem(0,line(icon,german)),0);
 assert.equal(api.playerChem(1,line(icon,german)),0);
});
