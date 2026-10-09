const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,".."),html=fs.readFileSync(path.join(root,"index.html"),"utf8"),css=fs.readFileSync(path.join(root,"flashback-card.css"),"utf8"),ps=fs.readFileSync(path.join(root,"playstyles.js"),"utf8");
const event=html.slice(html.indexOf("const FLASHBACK_REUS_BASE="),html.indexOf("function completeEventRoster("));
test("Reus Flashback gets LA Galaxy MLS, 88 OVR, 87/86/88/90/52/72 and Design 3",()=>{
 for(const x of ['id:"footera-flashback-reus-20261009"','team:"LA Galaxy"','league:"Major League Soccer"','ovr:88,position:"CAM"','stats:[87,86,88,90,52,72]','playstylePlusAdds:["technical"]'])assert.ok(event.includes(x),x);
 assert.ok(html.includes('item?.eventType==="flashback-sbc"'));assert.ok(html.includes('cls==="flashback"?" flashback-shell"'));
 assert.match(css,/card-flashback\.svg/);assert.match(ps,/id:"trivela"/);
});
test("release from October 9 19:00 to October 29 18:59 Berlin handles DST",()=>{
 const start=Date.parse("2026-10-09T19:00:00+02:00"),end=Date.parse("2026-10-29T19:00:00+01:00");
 assert.equal(end-start,20*86400000+3600000);
 assert.ok(event.includes("2026-10-09T19:00:00+02:00"));assert.ok(event.includes("2026-10-29T19:00:00+01:00"));
});
test("83 TOTW, 84 BVB and 85 German plus MLS are enforced by SBC validation",()=>{
 for(const x of ['minAvg:83,minTotw:1','minAvg:84,requiredClub:"Borussia Dortmund"','minAvg:85,requiredNation:"Germany",requiredLeague:"MLS"'])assert.ok(event.includes(x),x);
 for(const x of ["minTotwOk","requiredClubOk","requiredLeagueOk","totwCount","requiredClubCount","requiredLeagueCount"])assert.ok(html.includes(x));
 assert.ok(html.includes("state.sbcGroupClaims[sbc.groupSet]=true"));
});
