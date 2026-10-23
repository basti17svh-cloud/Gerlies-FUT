const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=require('./helpers/app-html.cjs')();
const picksJs=fs.readFileSync(path.join(__dirname,'../player-picks.js'),'utf8');
const picksSql=fs.readFileSync(path.join(__dirname,'../online/footera-player-picks.sql'),'utf8');
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}
function context(){
 const c={isMomentumItem:()=>false,isFounderItem:()=>false,isEvolutionItem:()=>false,rarityOf:()=> 'gold-rare'};vm.createContext(c);
 vm.runInContext(section('function isLegacyEventName(','function migrateLegacyEventState(')+section('function cardClass(p,item){','\n'),c);
 return c
}
const pickIcon=()=>({pid:'midicon-paolo-maldini',variant:'',rare:true,tradeable:false,acquisitionSource:'reward-pick',baseSnapshot:{id:'midicon-paolo-maldini',name:'Paolo Maldini',isIcon:true,ovr:93}});

test('an Icon delivered by a Player Pick with an empty variant renders as Icon',()=>{
 const c=context(),item=pickIcon();
 assert.equal(c.cardClass(item.baseSnapshot,item),'gold-rare');
 c.migrateLegacyEventItem(item);
 assert.equal(item.variant,'icon-mid');assert.equal(item.eventName,'Icon');
 assert.equal(c.cardClass(item.baseSnapshot,item),'icon');
 assert.equal(item.pid,'midicon-paolo-maldini');assert.equal(item.tradeable,false);
});

test('the repair leaves normal, special and cosmetic cards untouched',()=>{
 const c=context();
 const gold={pid:'203376',variant:'',rare:true},totw={pid:'241486',variant:'special',eventName:'Team of the Week 5'},icon={pid:'midicon-pele',variant:'icon-mid',eventName:'Icon'};
 for(const item of [gold,totw,icon]){const before=JSON.stringify(item);c.migrateLegacyEventItem(item);assert.equal(JSON.stringify(item),before)}
});

test('pick offers and deliveries pass through the Icon repair',()=>{
 assert.match(picksJs,/const item=pickIconItem\(\{\.\.\.o\.item/);
 assert.match(picksJs,/const item=pickIconItem\(data\.item\)/);
 assert.match(picksJs,/pickDuplicateLocation\(item\)/);
});

test('the server pick catalogue seeds Icons with the Icon variant',()=>{
 assert.match(picksSql,/'variant',case when \(card_snapshot->>'isIcon'\)::boolean then 'icon-mid' else '' end/);
 assert.match(picksSql,/jsonb_build_object\('eventName','Icon'\)/);
});
