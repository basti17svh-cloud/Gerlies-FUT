const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const base=path.join(__dirname,".."),code=fs.readFileSync(path.join(base,"footera-cosmetic-evolutions.js"),"utf8"),html=fs.readFileSync(path.join(base,"index.html"),"utf8"),css=fs.readFileSync(path.join(base,"footera-cosmetic-evolutions.css"),"utf8");
function setup(){
 const player={uid:"player-1",pid:"1",tradeable:true,base:{name:"Testspieler",ovr:82,pac:83,sho:79,pas:75,dri:82,def:35,phy:77}};
 const state={club:[player],coins:15000,champions:{totalWins:5},cosmeticClaims:{}};
 const nodes={evoGrid:{innerHTML:""},evolutionView:{classList:{contains:()=>true}}};
 let callback,renderCount=0,saved=0;
 const ctx={state,globalThis:null,
 document:{getElementById:id=>nodes[id],addEventListener:(name,fn)=>{if(name==="click")callback=fn}},
 displayBase:i=>i.base,itemRating:i=>i.base.ovr,
 cardHTML:(p,i)=>'<div class="card-shell" data-skin="'+(i?.cosmeticDesign||"original")+'">'+p.name+"</div>",
 isFounderItem:()=>false,isStoryItem:()=>false,isFooteraLiveCard:()=>false,
 renderAll:()=>{renderCount++},save:()=>{saved++},toast:()=>{}};
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
test("four cosmetic themes are selectable; red is unlocked from Weekend League wins",()=>{
 const c=setup();assert.equal(c.ctx.FooteraCosmetics.skins.length,4);
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
 assert.equal(c.player.tradeable,true);
 assert.equal(c.state.coins,15000);
 c.click("data-cosmetic-apply");
 assert.equal(c.state.cosmeticClaims.red,1,"duplicate application should not consume another token");
 c.click("data-cosmetic-clear");
 assert.equal(c.player.cosmeticDesign,undefined);
 assert.equal(c.state.cosmeticClaims.red,1,"restoring the old design must not refund a spent red token");
});
test("momentum cosmetic charges coins once and preserves player gameplay data",()=>{
 const c=setup();c.click("data-cosmetic-open",{cosmeticOpen:"momentum"});c.click("data-cosmetic-player",{cosmeticPlayer:"player-1"});
 c.click("data-cosmetic-apply");
 assert.equal(c.player.cosmeticDesign,"momentum");assert.equal(c.state.coins,10000);
 assert.equal(c.player.base.pac,83);assert.equal(c.player.base.ovr,82);assert.equal(c.player.tradeable,true);
});
test("red prestige requires wins and purchased live cards are excluded",()=>{
 const c=setup();c.click("data-cosmetic-open",{cosmeticOpen:"red-pro"});c.click("data-cosmetic-player",{cosmeticPlayer:"player-1"});
 c.click("data-cosmetic-apply");assert.equal(c.player.cosmeticDesign,undefined);
 assert.equal(c.state.cosmeticClaims["red-pro"],undefined);
});
