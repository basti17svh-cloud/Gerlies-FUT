const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const base=path.join(__dirname,".."),code=fs.readFileSync(path.join(base,"footera-cosmetic-evolutions.js"),"utf8"),html=require('./helpers/app-html.cjs')(base),css=fs.readFileSync(path.join(base,"footera-cosmetic-evolutions.css"),"utf8");
function setup(){
 const player={uid:"player-1",pid:"1",tradeable:true,base:{name:"Testspieler",ovr:82,pac:83,sho:79,pas:75,dri:82,def:35,phy:77}};
 const state={club:[player],coins:15000,champions:{totalWins:5},cosmeticClaims:{},transferList:[]};
 const nodes={evoGrid:{innerHTML:""},evolutionView:{classList:{contains:()=>true}}};
 let callback,renderCount=0,saved=0;
 const ctx={state,globalThis:null,activeEvoTab:"cosmetic",
 document:{getElementById:id=>nodes[id],addEventListener:(name,fn)=>{if(name==="click")callback=fn}},
 displayBase:i=>i.base,itemRating:i=>i.base.ovr,
 cardHTML:(p,i)=>'<div class="card-shell" data-skin="'+(i?.cosmeticDesign||"original")+'">'+p.name+"</div>",
 isFounderItem:()=>false,isStoryItem:()=>false,isFooteraLiveCard:()=>false,
 renderAll:()=>{renderCount++;if(ctx.activeEvoTab==="cosmetic")ctx.FooteraCosmetics.render();else nodes.evoGrid.innerHTML="Evolutionen verfügbar"},save:()=>{saved++},toast:()=>{}};
 ctx.globalThis=ctx;vm.runInNewContext(code,ctx);
 function click(action,values={}){
  const node={dataset:values,hasAttribute:k=>k===action};
  callback({target:{closest:selector=>selector==="#evoGrid"?{}:selector.includes("data-cosmetic")?node:null}})
 }
 return{ctx,player,state,nodes,click,get counts(){return{renderCount,saved}}}
}
test("cosmetic category and shared card layouts are wired up",()=>{
 assert.match(html,/data-evo-tab="cosmetic"/);
 assert.match(html,/FooteraCosmetics\.render\(\)/);
 assert.match(html,/cosmeticDesign==="red"/);
 assert.match(html,/cosmeticDesign==="momentum"/);
 assert.match(html,/cosmeticDesign==="totw"/);
 assert.match(css,/\.champions-red/);
 assert.match(css,/\.champions-pro/);
});
test("five cosmetic themes (incl. time-limited Halloween) exist; red is unlocked from Weekend League wins",()=>{
 const c=setup();assert.equal(c.ctx.FooteraCosmetics.skins.length,5);
 c.ctx.FooteraCosmetics.render();
 assert.match(c.nodes.evoGrid.innerHTML,/Champions Rot/);
 assert.match(c.nodes.evoGrid.innerHTML,/MOMENTUM/);
 c.click("data-cosmetic-open",{cosmeticOpen:"red"});
 c.click("data-cosmetic-player",{cosmeticPlayer:"player-1"});
 assert.match(c.nodes.evoGrid.innerHTML,/data-skin="red"/);
 c.click("data-cosmetic-apply");
 assert.equal(c.player.cosmeticDesign,"red");
 assert.equal(c.state.cosmeticClaims.red,1);
 assert.equal(c.player.base.ovr,82);
 assert.equal(c.player.base.pac,83);
 assert.equal(c.player.tradeable,false);
 assert.equal(c.state.coins,15000);
 c.click("data-cosmetic-apply");
 assert.equal(c.state.cosmeticClaims.red,1,"duplicate application should not consume another token");
 c.ctx.activeEvoTab="cosmetic";c.click("data-cosmetic-open",{cosmeticOpen:c.player.cosmeticDesign});c.click("data-cosmetic-player",{cosmeticPlayer:"player-1"});
 c.click("data-cosmetic-clear");
 assert.equal(c.player.cosmeticDesign,undefined);
 assert.equal(c.state.cosmeticClaims.red,1,"restoring the old design must not refund a spent red token");
});
test("momentum cosmetic charges coins once and preserves player gameplay data",()=>{
 const c=setup();c.click("data-cosmetic-open",{cosmeticOpen:"momentum"});c.click("data-cosmetic-player",{cosmeticPlayer:"player-1"});
 c.click("data-cosmetic-apply");
 assert.equal(c.player.cosmeticDesign,"momentum");assert.equal(c.state.coins,3000);
 assert.equal(c.player.base.pac,83);assert.equal(c.player.base.ovr,82);assert.equal(c.player.tradeable,false);
});
test("red prestige requires wins and purchased live cards are excluded",()=>{
 const c=setup();c.click("data-cosmetic-open",{cosmeticOpen:"red-pro"});c.click("data-cosmetic-player",{cosmeticPlayer:"player-1"});
 c.click("data-cosmetic-apply");assert.equal(c.player.cosmeticDesign,undefined);
 assert.equal(c.state.cosmeticClaims["red-pro"],undefined);
});

test("TOTW cosmetic costs 20000 and makes a genuine SBC-eligible nontradeable special card",()=>{
 const c=setup();c.state.coins=30000;
 c.state.transferList.push("player-1");
 c.click("data-cosmetic-open",{cosmeticOpen:"totw"});
 c.click("data-cosmetic-player",{cosmeticPlayer:"player-1"});
 c.click("data-cosmetic-apply");
 assert.equal(c.player.cosmeticDesign,"totw");
 assert.equal(c.state.coins,10000);
 assert.equal(c.player.tradeable,false);
 assert.deepEqual(c.state.transferList,[]);
 assert.equal(c.player.base.ovr,82);
 assert.equal(c.player.base.pac,83);
 c.ctx.activeEvoTab="cosmetic";c.click("data-cosmetic-open",{cosmeticOpen:c.player.cosmeticDesign});c.click("data-cosmetic-player",{cosmeticPlayer:"player-1"});
 c.click("data-cosmetic-clear");
 assert.equal(c.player.tradeable,false,"reverting cosmetics must not restore tradeability");
});
test("TOTW and MOMENTUM conversion only accepts normal gold cards, not ICONs or bronze",()=>{
 const c=setup();c.player.base.ovr=69;
 c.click("data-cosmetic-open",{cosmeticOpen:"totw"});
 c.click("data-cosmetic-player",{cosmeticPlayer:"player-1"});
 c.click("data-cosmetic-apply");
 assert.equal(c.player.cosmeticDesign,undefined);
 c.player.base.ovr=83;c.player.variant="icon-mid";
 c.click("data-cosmetic-apply");
 assert.equal(c.player.cosmeticDesign,undefined);
});
test("SBC rules recognize TOTW and MOMENTUM special types, not only their artwork",()=>{
 const src=html.match(/^function isTotwSbcItem\([^\n]*$/m);
 const msrc=html.match(/^function isMomentumSbcItem\([^\n]*$/m);
 assert(src&&msrc,"SBC helper must exist");
 const c={};vm.createContext(c);
 vm.runInContext(src[0]+"\n"+msrc[0],c);
 assert.equal(c.isTotwSbcItem({cosmeticDesign:"totw"}),true);
 assert.equal(c.isTotwSbcItem({cosmeticDesign:"momentum"}),false);
 assert.equal(c.isTotwSbcItem({cosmeticDesign:"red"}),false);
 assert.equal(c.isTotwSbcItem({eventName:"Team of the Week 5",variant:"special"}),true);
 assert.equal(c.isMomentumSbcItem({cosmeticDesign:"momentum"}),true);
 assert.equal(c.isMomentumSbcItem({cosmeticDesign:"totw"}),false);
 assert.match(html,/items\.filter\(isTotwSbcItem\)/);
 assert.match(html,/items\.filter\(isMomentumSbcItem\)/);
 // Since V21.176 SBC and club filters share pickerItemQuality (via itemMatchesQuality since V21.315), which counts cosmetic designs as special.
 assert.match(html,/itemMatchesQuality\(x\.item,/);assert.match(html,/if\(item\?\.variant\|\|item\?\.cosmeticDesign\|\|item\?\.eventType\)return "special"/);
 assert.match(html,/item\?\.variant\|\|item\?\.cosmeticDesign\|\|item\?\.eventType/);
 assert.match(html,/item\?\.cosmeticDesign==="totw"\)return"TEAM OF THE WEEK · EVO"/);
});


test("successful cosmetic applications return to the Evolution overview and clear the selected player",()=>{
 for(const skin of ['red','momentum']){
  const c=setup();c.click('data-cosmetic-open',{cosmeticOpen:skin});c.click('data-cosmetic-player',{cosmeticPlayer:'player-1'});
  c.click('data-cosmetic-apply');assert.equal(c.ctx.activeEvoTab,'available');assert.equal(c.nodes.evoGrid.innerHTML,'Evolutionen verfügbar');
  assert.equal(c.counts.saved,1);const balance=c.state.coins;c.click('data-cosmetic-apply');assert.equal(c.state.coins,balance);assert.equal(c.counts.saved,1);
  c.ctx.activeEvoTab='cosmetic';c.ctx.FooteraCosmetics.render();assert.match(c.nodes.evoGrid.innerHTML,/Dein Spieler. Dein Design./);assert.doesNotMatch(c.nodes.evoGrid.innerHTML,/cosmetic-before-after/);
 }
});
test("unsuccessful cosmetic application stays in the preview",()=>{
 const c=setup();c.state.coins=0;c.click('data-cosmetic-open',{cosmeticOpen:'momentum'});c.click('data-cosmetic-player',{cosmeticPlayer:'player-1'});
 c.click('data-cosmetic-apply');assert.equal(c.ctx.activeEvoTab,'cosmetic');assert.match(c.nodes.evoGrid.innerHTML,/cosmetic-before-after/);assert.equal(c.counts.saved,0);
});
