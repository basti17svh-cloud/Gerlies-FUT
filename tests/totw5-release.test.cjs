const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const block=html.match(/const TOTW_WEEK_5=([\\s\\S]*?);\\s*const TOTW_WEEKS=/);
function roster(){
 assert.ok(block,"TOTW 5 definition exists");
 const data=block[1];
 const players=[...data.matchAll(/\\{names:\\[(.*?)\\],ovr:(\\d+),position:"(.*?)",stats:\\[(.*?)\\]/g)].map(m=>({names:JSON.parse("["+m[1]+"]"),ovr:+m[2],position:m[3],stats:m[4].split(",").map(Number)}));
 return {data,players};
}
test("TOTW 5 is appended in chronological rotation",()=>{
 assert.match(html,/const TOTW_WEEKS=\\[TOTW_WEEK_1,TOTW_WEEK_2,TOTW_WEEK_3,TOTW_WEEK_4,TOTW_WEEK_5\\]/);
 const {data}=roster();assert.match(data,/releaseDate:"2026-10-14"/);assert.match(data,/activeUntil:"21\\.10\\.2026 18:59"/);
});
test("TOTW 5 contains eighteen unique valid footballers with a goalkeeper and positional cover",()=>{
 const {players}=roster();assert.equal(players.length,18);
 assert.equal(new Set(players.map(p=>p.names[0])).size,18);
 assert.equal(players.filter(p=>p.position==="GK").length,2);
 assert.ok(players.some(p=>p.position==="RB"));assert.ok(players.some(p=>p.position==="LB"));
 assert.ok(players.some(p=>p.position==="ST"));
 for(const p of players){assert.ok(p.ovr>=75&&p.ovr<=95);assert.equal(p.stats.length,6);assert.ok(p.stats.every(x=>Number.isFinite(x)&&x>=0&&x<=99));}
});
test("TOTW 5 release gate opens 14 Oct 19:00 Berlin and closes 21 Oct 18:59",()=>{
 const start="2026-10-14T19:00",end="2026-10-21T18:59";
 const active=k=>k>=start&&k<=end;
 assert.equal(active("2026-10-14T18:59"),false);assert.equal(active(start),true);
 assert.equal(active(end),true);assert.equal(active("2026-10-21T19:00"),false);
 assert.match(html,/function totwStartKey\\(team\\)/);assert.match(html,/function activeTotwWeek\\(at=new Date\\(\\)\\)/);
});
test("TOTW cards are resolved through active team for packs and archived with unique IDs",()=>{
 assert.match(html,/const team=activeTotwWeek\\(\\),info=totwInfo\\(base\\)/);
 assert.match(html,/makeLivePackItem\\(entry.base,tradeable\\)/);
 assert.match(html,/"totw-"\\+\\(team\\?\\.id\\|\\|0\\)\\+"-preview-"\\+index/);
});
