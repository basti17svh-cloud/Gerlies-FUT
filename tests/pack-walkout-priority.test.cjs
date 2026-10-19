const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const html=require('./helpers/app-html.cjs')();
const extract=(a,b)=>{const from=html.indexOf(a),to=html.indexOf(b,from);assert.ok(from>=0&&to>from);return html.slice(from,to)};
const logic=extract("function packIsSpecial(item)","function finishPack()");
const item=(id,ovr,variant="",eventName="",eventType="")=>({id,ovr,variant,eventName,eventType});
const run=(items)=>{const ctx={pendingPack:items,itemRating:x=>x.ovr,isFounderItem:x=>x.id==="founder",totwDisplayName:x=>x};vm.createContext(ctx);return vm.runInContext(logic+";this.get=packRevealPlan;this.theme=packRevealTheme;",ctx),{plan:ctx.get(),theme:ctx.theme}};
test("Walkout priorities: ICON > eligible special >=84 > gold >=86",()=>{
 for(const [items,ids] of [
  [[item("gold",97),item("totw",90,"special","Team of the Week"),item("icon",87,"icon-mid")],["icon","totw"]],
  [[item("gold",95),item("special",84,"special")],["special","gold"]],
  [[item("icon82",82,"icon-mid"),item("icon90",90,"icon-mid"),item("special",97,"special")],["icon90","icon82"]]
 ]){const r=run(items);assert.equal(r.plan.mode,"double");assert.deepEqual(Array.from(r.plan.cards,x=>x.id),ids)}
});
test("Special 83 and below use short board; special 84 is a full walkout",()=>{
 for(const rating of [71,82,83]){const r=run([item("s",rating,"special")]);assert.equal(r.plan.mode,"board");assert.equal(r.plan.duration,2350)}
 for(const variant of ["totw","momentum"]){const r=run([item("s",84,"special",variant==="totw"?"Team of the Week":"MOMENTUM",variant)]);assert.equal(r.plan.mode,"special")}
 assert.equal(run([item("g",85)]).plan.mode,"board");
 assert.equal(run([item("g",86)]).plan.mode,"walkout");
 assert.equal(run([item("g",78)]).plan.mode,"plain");
 assert.equal(run([item("founder",88)]).plan.label,"FOOTERA FOUNDER")
});
test("Theme assignment colors TOTW gold, ICON white, other special turquoise in board and tunnel",()=>{
 for(const [card,mode,theme] of [[item("i",88,"icon-mid"),"special","icon"],[item("t",84,"special","Team of the Week"),"special","totw"],[item("t",82,"special","Team of the Week"),"board","totw"],[item("s",82,"special","MOMENTUM"),"board","special"],[item("g",88),"walkout","gold"]]){const result=run([card]);assert.equal(result.plan.mode,mode);assert.equal(result.theme(result.plan.cards[0]),theme)}
 assert.match(html,/\.opening\.theme-icon\{--pack-beam:#fff/);
 assert.match(html,/\.opening\.theme-totw\{--pack-beam:#ffcf4a/);
 assert.match(html,/\.opening\.theme-special\{--pack-beam:#59ffe7/);
 assert.match(html,/\.opening:is\(\.theme-totw,\.theme-icon,\.theme-special\)\.mode-board \.board-stripe/);
 assert.match(html,/const theme=packRevealTheme\(plan\.cards\[0\]\)/);
 assert.match(html,/spawnPackConfetti\(plan\.mode==="double"\?125:plan\.mode==="special"\?100:90,theme\)/);
});
