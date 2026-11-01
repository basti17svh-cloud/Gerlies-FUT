const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const html=require("./helpers/app-html.cjs")(root);
const src=fs.readFileSync(path.join(root,"footera-tutorial.js"),"utf8");
const worker=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");

function element(){
 return{hidden:false,innerHTML:"",style:{setProperty(){}},classList:{toggle(){},contains:()=>false,add(){},remove(){}},
  setAttribute(){},addEventListener(){},append(){},getBoundingClientRect:()=>({width:0,height:0,top:0,left:0,bottom:0}),isConnected:true}
}
function setup(initial){
 const state=initial||{coins:5000,packs:{},rewardPackQueue:[],stats:{matches:0},profile:{clubName:"Tester FC"},club:[],pendingPack:[]};
 let saves=0,renders=0;const toasts=[];
 const document={readyState:"complete",body:element(),createElement:()=>element(),querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}};
 const context={state,save(){saves++},renderAll(){renders++},toast:t=>toasts.push(t),currentViewId:()=>"homeView",document,
  window:{},setInterval:()=>1,setTimeout:()=>0,addEventListener(){},getComputedStyle:()=>({display:"block",visibility:"visible",opacity:"1"}),innerHeight:844,Date,Number,String,Array,Object,JSON};
 context.window=context;context.globalThis=context;
 vm.createContext(context);vm.runInContext(src,context);
 return{context,state,api:context.FooteraTutorial,toasts,get saves(){return saves}};
}

test("tutorial script and stylesheet ship with the build and the service worker",()=>{
 assert.match(html,/<script src="\.\/footera-tutorial\.js\?v=21330"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="\.\/footera-tutorial\.css\?v=21330">/);
 assert.match(worker,/"\.\/footera-tutorial\.js\?v=21330"/);
 assert.match(worker,/"\.\/footera-tutorial\.css\?v=21330"/);
 assert.ok(html.indexOf("footera-app.js")<html.indexOf("footera-tutorial.js"),"tutorial loads after the app");
});

test("only the starter-pack opening starts the tutorial, existing clubs never see it",()=>{
 assert.match(html,/state\.onboarded=true;[^\n]*toast\("Starterkader erhalten\."\);globalThis\.FooteraTutorial\?\.begin\(\)/);
 const old=setup({coins:90000,packs:{gold:2},stats:{matches:240},profile:{clubName:"Alt FC"},club:[]});
 assert.equal(old.api.active(),false);
 assert.equal(old.state.tutorial,undefined);
 assert.equal(old.state.packs.welcome,undefined);
});

test("welcome pack is a reward-only gold pack that cannot be bought",()=>{
 const m=html.match(/\{id:"welcome",[^\n]*?\},\n/);assert.ok(m,"welcome pack defined");
 const pack=vm.runInNewContext("("+m[0].trim().replace(/,$/,"")+")");
 assert.equal(pack.coins,null);assert.equal(pack.points,null);assert.equal(pack.store,false);assert.equal(pack.reward,true);
 assert.equal(pack.count,5);assert.equal(pack.guarantee,81);
 assert.deepEqual(JSON.parse(JSON.stringify(pack.composition)),[{quality:"gold",count:5,min:75,max:99}]);
});

test("begin creates the tutorial once and follows the planned steps",()=>{
 const t=setup();
 assert.deepEqual([...t.api.steps],["welcome","squad","match","pack","market","objectives","sbc","done"]);
 t.api.begin();
 assert.equal(t.state.tutorial.step,"welcome");assert.equal(t.api.active(),true);
 t.state.tutorial.step="sbc";t.api.begin();
 assert.equal(t.state.tutorial.step,"sbc","a second begin does not restart a running tutorial");
});

test("the welcome pack is granted exactly once, untradeable, when the pack step starts",()=>{
 const t=setup();t.api.begin();
 t.api._next();t.api._next();
 assert.equal(t.state.tutorial.step,"match");assert.equal(t.state.packs.welcome,undefined);
 t.api._next();
 assert.equal(t.state.tutorial.step,"pack");
 assert.equal(t.state.packs.welcome,1);
 assert.deepEqual(JSON.parse(JSON.stringify(t.state.rewardPackQueue)),[{id:"welcome",tradeable:false}]);
 t.state.tutorial.step="match";t.api._next();
 assert.equal(t.state.packs.welcome,1,"no second pack when the pack step is entered again");
 t.api._skip();
 assert.equal(t.state.packs.welcome,1,"skipping after the gift does not add another pack");
 assert.equal(t.state.rewardPackQueue.length,1);
});

test("finishing pays the bonus once; skipping gives the pack but no bonus",()=>{
 const done=setup();done.api.begin();
 done.state.tutorial.step="done";done.state.tutorial.packGranted=true;
 done.api._finish();done.api._finish();
 assert.equal(done.state.coins,5000+done.api.finishCoins);
 assert.equal(done.state.tutorial.done,true);assert.equal(done.api.active(),false);

 const skipped=setup();skipped.api.begin();skipped.api._skip();skipped.api._skip();
 assert.equal(skipped.state.coins,5000);
 assert.equal(skipped.state.packs.welcome,1);
 assert.equal(skipped.state.tutorial.skipped,true);
 assert.equal(skipped.api.active(),false);
 skipped.api._finish();
 assert.equal(skipped.state.coins,5000,"a skipped tutorial cannot be finished for the bonus later");
});
