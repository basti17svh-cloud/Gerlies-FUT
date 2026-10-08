const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const src=fs.readFileSync(path.join(root,"weekly-rewards.js"),"utf8");
const css=fs.readFileSync(path.join(root,"weekly-rewards.css"),"utf8");
const worker=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");

function setup(rows){
 const elements={
  weeklyRewardHome:{hidden:true,innerHTML:""},
  weeklyRewardModal:{classList:{contains:()=>true}},
  weeklyRewardModalBody:{innerHTML:""},
  weeklyRewardModalClose:{focus(){}},
  promoCodeInput:{value:""},
  promoStatus:{className:"",textContent:""}
 };
 const clicks=[];
 let saves=0;
 const context={state:{weeklyRewards:rows,directClaims:{},coins:500,packs:{}},save(){saves++},renderAll(){},toast(){},window:{},document:{getElementById:id=>elements[id]||null,addEventListener:(name,fn)=>{if(name==="click")clicks.push(fn)}},
  setTimeout:fn=>fn(),Intl,Date,PACKS:[{id:"gold",name:"Gold Pack",count:3},{id:"reward-75-5",name:"5× 75+ Spieler-Pack",count:5}],
  syncCompetitionWeeks(){},competitionPending:()=>rows.filter(r=>!r.claimed),claimCompetitionReward(mode,week){
   const row=rows.find(r=>r.mode===mode&&r.week===week&&!r.claimed);if(!row)return false;row.claimed=true;return true
  },renderCompetitionHome(){},showUiLayer(){},closeUiLayer(){},removeUiLayer(){},switchView(){},
  esc:String,fmt:String,packArtSrc:()=> "./assets/footera/gold.webp"};
 vm.createContext(context);vm.runInContext(src,context);
 function click(attr,data={}){const target={closest:selector=>selector===attr?{dataset:data,disabled:false}:null};clicks[0]({target,preventDefault(){}})}
 function promo(code){elements.promoCodeInput.value=code;const event={type:"click",target:{closest:sel=>sel==="#redeemPromoCode"?{}:null},preventDefault(){},stopImmediatePropagation(){}};clicks[1](event)}
 return{context,elements,click,promo,get saves(){return saves}}
}
test("reward banner sits between rotating hero and season countdown and is loaded in shell",()=>{
 const a=html.indexOf('id="homeHeroCard"'),b=html.indexOf('id="weeklyRewardHome"'),c=html.indexOf('id="competitionHome"');
 assert.ok(a>=0&&a<b&&b<c);
 assert.match(html,/weekly-rewards\.js\?v=2128/);
 assert.match(html,/weekly-rewards\.css\?v=2128/);
 assert.match(worker,/weekly-rewards\.js\?v=2128/);
 assert.match(worker,/weekly-rewards\.css\?v=2128/);
 assert.doesNotThrow(()=>new vm.Script(src));
 assert.match(css,/\.weekly-reward-claim/);
});
test("all three competition types display ranks and their actual rewards",()=>{
 const rows=[
  {mode:"rivals",week:"1000",division:0,milestone:35,reward:{coins:17500,packs:[{id:"gold",tradeable:true}]}},
  {mode:"squad",week:"2000",rank:"Gold 1",points:13000,reward:{coins:11000,packs:[{id:"reward-75-5",tradeable:false}]}},
  {mode:"champions",week:"3000",rank:"Rang IV",wins:9,losses:6,reward:{coins:35000,packs:[{id:"gold",tradeable:false}]}}
 ];
 const {context,elements}=setup(rows);context.renderCompetitionHome();
 assert.equal(elements.weeklyRewardHome.hidden,false);
 assert.match(elements.weeklyRewardHome.innerHTML,/3 Belohnungen/);
 context.window.FooteraWeeklyRewards.open();
 assert.match(elements.weeklyRewardModalBody.innerHTML,/Rang IV/);
 assert.match(elements.weeklyRewardModalBody.innerHTML,/35000/);
 assert.match(elements.weeklyRewardModalBody.innerHTML,/Untauschbar/);
 const key="squad|2000";
 context.window.FooteraWeeklyRewards.open("squad","2000");
 assert.match(elements.weeklyRewardModalBody.innerHTML,/Gold 1/);
 assert.match(elements.weeklyRewardModalBody.innerHTML,/75\+/);
 context.window.FooteraWeeklyRewards.open("rivals","1000");
 assert.match(elements.weeklyRewardModalBody.innerHTML,/Elite Division/);
 assert.match(elements.weeklyRewardModalBody.innerHTML,/Upgrade-Belohnung/);
});
test("claiming removes only that pending reward, refuses a second claim and hides the banner when finished",()=>{
 const rows=[{mode:"rivals",week:"1000",division:8,milestone:15,reward:{coins:4000,packs:[{id:"gold",tradeable:true}]}}];
 const {context,elements,click}=setup(rows);context.renderCompetitionHome();context.window.FooteraWeeklyRewards.open();
 click("[data-weekly-reward-claim]",{weeklyRewardClaim:"rivals",week:"1000"});
 assert.equal(rows[0].claimed,true);
 assert.equal(elements.weeklyRewardHome.hidden,true);
 assert.match(elements.weeklyRewardModalBody.innerHTML,/Alles abgeholt/);
 click("[data-weekly-reward-claim]",{weeklyRewardClaim:"rivals",week:"1000"});
 assert.equal(rows.filter(x=>x.claimed).length,1);
});

test("one-time Rivals retest restores only the latest claimed Rivals reward without a premature payout",()=>{
 const old={mode:"rivals",week:"1000",division:9,milestone:15,reward:{coins:2500,packs:[{id:"gold",tradeable:true}]},claimed:true};
 const last={mode:"rivals",week:"3000",division:5,milestone:35,reward:{coins:16000,packs:[{id:"primegold",tradeable:true}]},claimed:true};
 const squad={mode:"squad",week:"2000",reward:{coins:5000,packs:[]},claimed:true};
 const t=setup([old,squad,last]);
 t.promo("RIVALSTEST28");
 assert.equal(last.claimed,false);
 assert.equal(old.claimed,true);
 assert.equal(squad.claimed,true);
 assert.equal(t.context.state.coins,500);
 assert.deepEqual(t.context.state.packs,{});
 assert.equal(t.saves,1);
 assert.equal(t.context.state.directClaims["rivals-weekly-retest-v2128"].week,"3000");
 assert.match(t.elements.weeklyRewardHome.innerHTML,/RIVALS/);
 t.promo("RIVALSTEST28");
 assert.equal(t.saves,1);
 assert.match(t.elements.promoStatus.textContent,/bereits verwendet/);
});
test("Rivals retest refuses to overwrite existing pending rewards or fabricate missing ones",()=>{
 const pending={mode:"rivals",week:"3000",reward:{coins:4000,packs:[]},claimed:false};
 const prior={mode:"rivals",week:"1000",reward:{coins:3000,packs:[]},claimed:true};
 const t=setup([pending,prior]);
 t.promo("rivalstest28");
 assert.equal(prior.claimed,true);
 assert.equal(pending.claimed,false);
 assert.equal(t.saves,0);
 assert.equal(t.context.state.directClaims["rivals-weekly-retest-v2128"],undefined);
 const none=setup([]);none.promo("rivalstest28");
 assert.equal(none.saves,0);
 assert.match(none.elements.promoStatus.textContent,/Keine bereits abgeholte/);
});

test("weekly rewards group identical packs and show number of packs, not players inside",()=>{
 const packs=[
  {id:"86",tradeable:true},
  {id:"primegold",tradeable:true},
  {id:"primegold",tradeable:true},
  {id:"totw-reward",tradeable:true}
 ];
 const row={mode:"rivals",week:"1000",division:1,milestone:35,reward:{coins:50000,packs}};
 const {context,elements}=setup([row]);
 context.PACKS.push(
  {id:"86",name:"86+ Players Pack",count:1},
  {id:"primegold",name:"Prime Goldspieler-Pack",count:12},
  {id:"totw-reward",name:"TOTW-Spieler-Pack",count:1}
 );
 context.window.FooteraWeeklyRewards.open("rivals","1000");
 const html=elements.weeklyRewardModalBody.innerHTML;
 assert.equal((html.match(/class="weekly-reward-pack"/g)||[]).length,3);
 assert.equal((html.match(/Prime Goldspieler-Pack/g)||[]).length,1);
 assert.deepEqual([...html.matchAll(/class="weekly-reward-pack-count">([^<]+)</g)].map(m=>m[1]),["1×","2×","1×"]);
 assert.match(html,/4 Packs \+ Coins/);
 assert.doesNotMatch(html,/weekly-reward-pack-count">12×/);
 assert.deepEqual(packs.map(p=>p.id),["86","primegold","primegold","totw-reward"]);
 assert.equal(packs.some(p=>Object.hasOwn(p,"qty")),false);
});
test("tradeable and untradeable copies remain distinct rewards",()=>{
 const row={mode:"squad",week:"1000",rank:"Gold 1",points:13000,reward:{coins:0,packs:[
  {id:"primegold",tradeable:true},{id:"primegold",tradeable:false},{id:"primegold",tradeable:false}
 ]}};
 const {context,elements}=setup([row]);
 context.PACKS.push({id:"primegold",name:"Prime Goldspieler-Pack",count:12});
 context.window.FooteraWeeklyRewards.open("squad","1000");
 const html=elements.weeklyRewardModalBody.innerHTML;
 assert.equal((html.match(/class="weekly-reward-pack"/g)||[]).length,2);
 assert.deepEqual([...html.matchAll(/class="weekly-reward-pack-count">([^<]+)</g)].map(m=>m[1]),["1×","2×"]);
 assert.equal((html.match(/<small>Tauschbar<\/small>/g)||[]).length,1);
 assert.equal((html.match(/<small>Untauschbar<\/small>/g)||[]).length,1);
 assert.equal(row.reward.packs.length,3);
});
