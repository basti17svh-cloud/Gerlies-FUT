const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const src=fs.readFileSync(path.join(__dirname,"..","footera-app.js"),"utf8");
const start=src.indexOf("const LEAGUE_CANONICAL_NAMES=");
const end=src.indexOf("function leagueFromClub(");
assert.ok(start>0&&end>start,"league helpers found");
const api=new Function(src.slice(start,end)+";return{canonicalLeagueName,sortLeaguesTop5First}")();

test("league filters show the Top 5 leagues first, the rest alphabetically",()=>{
 const out=api.sortLeaguesTop5First(["Eredivisie","Ligue 1","2. Bundesliga","Serie A","Allsvenskan","Bundesliga","Premier League","LALIGA EA SPORTS","1A Pro League"]);
 assert.deepEqual(out,["Premier League","LALIGA EA SPORTS","Bundesliga","Serie A","Ligue 1","1A Pro League","2. Bundesliga","Allsvenskan","Eredivisie"]);
});

test("one name per league so no league appears twice",()=>{
 assert.equal(api.canonicalLeagueName("Bundesliga 2"),"2. Bundesliga");
 assert.equal(api.canonicalLeagueName("Ö. Bundesliga"),"Österreichische Fußball-Bundesliga");
 assert.equal(api.canonicalLeagueName("Liga I"),"SUPERLIGA");
 assert.equal(api.canonicalLeagueName("Super League Greece"),"Hellas Liga");
 assert.equal(api.canonicalLeagueName("Bundesliga"),"Bundesliga");
 assert.equal(api.canonicalLeagueName("Premier League"),"Premier League");
});
