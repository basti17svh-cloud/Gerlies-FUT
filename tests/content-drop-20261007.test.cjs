const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"manifest.webmanifest"),"utf8"));

function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>=0&&b>a,from);return html.slice(a,b)}

test("V21.24 shell keeps the 7 October 19:00 content drop",()=>{
 assert.match(html,/<title>Footera V21\.24<\/title>/);
 assert.equal(manifest.start_url,"./index.html?v=21.24");
 assert.match(html,/const GFUT_BUILD="V21\.24"/);
});

test("TOTW 4 is admin-approved for Wednesday 7 October at 19:00 with the Footera 18-card structure",()=>{
 const totw=section("const TOTW_WEEK_4=","const TOTW_WEEKS=");
 assert.match(totw,/id:4,name:"Team of the Week 4",releaseDate:"2026-10-07",activeUntil:"14\.10\.2026 18:59"/);
 assert.match(totw,/sourceStatus:"admin-approved"/);
 assert.equal((totw.match(/\{names:\[/g)||[]).length,18);
 assert.equal((totw.match(/position:"GK"/g)||[]).length,2);
 assert.equal((totw.match(/position:"(?:LB|RB|CB)"/g)||[]).length,5);
 assert.equal((totw.match(/position:"(?:CM|CAM)"/g)||[]).length,6);
 assert.equal((totw.match(/position:"(?:ST|RW)"/g)||[]).length,5);
 for(const name of ["Giorgi Mamardashvili","Gianluigi Donnarumma","Joao Cancelo","Ciaron Brown","David Hancko","Lasha Dvali","Neco Williams","Jude Bellingham","Mikel Merino","Kevin De Bruyne","Florian Wirtz","Tom Bischof","Fabian Rieder","Harry Kane","Bukayo Saka","Robert Lewandowski","Goncalo Ramos","Rasmus Hojlund"])assert.ok(totw.includes(name),name);
 assert.match(html,/const TOTW_WEEKS=\[TOTW_WEEK_1,TOTW_WEEK_2,TOTW_WEEK_3,TOTW_WEEK_4\]/);
});

test("Takefusa Kubo is the Team 2 MOMENTUM SBC player from Wednesday 19:00 to event end",()=>{
 const team=section('const MOMENTUM_TEAM_2=','MOMENTUM_EVENT.shortName=');
 assert.match(team,/id:"momentum-kubo-86",pid:"237681",name:"Takefusa Kubo"/);
 assert.match(team,/ovr:86,position:"RW",baseOvr:80/);
 assert.match(team,/team:"Real Sociedad",nation:"Japan",league:"LALIGA EA SPORTS",alt:"RM,LW,CAM"/);
 assert.match(team,/stats:\[91,84,86,90,49,70\]/);
 assert.match(team,/releaseAt:"2026-10-07T19:00:00\+02:00"/);
 assert.match(team,/activeUntilAt:"2026-10-09T19:00:00\+02:00"/);
 const sbc=section("function activeEventPlayerSBCs","function allActiveSBCs");
 assert.match(sbc,/MOMENTUM – 83er-Team/);
 assert.match(sbc,/MOMENTUM – 84er-Team/);
 assert.match(html,/EVENT-SBC · \$\{esc\(sbcReleaseScheduleLabel\(def\.releaseAt\)\)\}/);
});

test("Ultimate and Jumbo Rare are the only special shop rotation for the 7 October window",()=>{
 const store=section("const PROMO_PACK_RELEASES=","function activeStorePacks");
 assert.match(store,/"2026-10-07":\{startsAt:"2026-10-07T19:00:00\+02:00",ids:\["ultimate","jumbo-rare"\]\}/);
 assert.match(store,/release=promoPackReleaseForKey\(key\),ids=release\?\.ids\|\|sets\[cycle\]/);
 const packs=section("const PACKS=[","// This account-only gift");
 assert.match(packs,/id:"ultimate"[\s\S]*?dailyLimit:10,resetHour:19/);
 assert.match(packs,/id:"jumbo-rare"[\s\S]*?dailyLimit:10,resetHour:19/);
});

console.log("V21.23 Content Drop 07.10.: Kubo SBC, TOTW 4 und Ultimate/Jumbo Rare 19:00 geplant");
