const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const{resolveTransfers,sameClub}=require('../scripts/club-transfers.cjs');

// EA freezes its squads before the transfer window closes; scripts/club-transfers.cjs adds the late moves from Wikidata.
const root=path.join(__dirname,'..');
const ea=(id,name,club,league,overall=80,gender="Men's Football")=>({player_id:id,common_name:name,short_name:name,long_name:name,club_name:club,club_team_id:'t-'+club,club_logo_url:'logo-'+club,league_name:league,overall,gender});
const rows=[
 ea(241721,'Rafael Leão','AC Milan','Serie A Enilive',83),ea(1,'Other','Galatasaray','Trendyol Süper Lig',84),
 ea(2,'Rodinei','Olympiacos FC','Hellas Liga',77),ea(3,'Laguna Star','Santos Laguna','Liga BBVA MX'),
 ea(4,'Moved Already','Fenerbahçe','Trendyol Süper Lig'),ea(5,'Spurs Man','Chelsea','Premier League'),ea(6,'X','Spurs','Premier League'),
 ea(7,'Same Name','Arsenal','Premier League'),ea(8,'W Player','Arsenal','Barclays WSL',80,"Women's Football"),ea(9,'Y','Chelsea','Barclays WSL',80,"Women's Football")
];
const wd=(name,spells)=>({q:'Q'+name.length,name,aliases:[],spells:spells.map(([club,start,end,loan])=>({club,start,end:end||'',loan:!!loan}))});
const players=[
 wd('Rafael Leão',[['AC Milan','2019-01-01','2026-08-29'],['Galatasaray S.K.','2026-08-29'],["Portugal men's national football team",'2021-01-01']]),
 wd('Rodinei',[['Olympiacos F.C.','2022-07-01','2026-09-02'],['Santos F.C.','2026-09-02']]),
 wd('Moved Already',[['Fenerbahçe S.K.','2020-01-01','2026-07-01'],['Galatasaray S.K.','2026-07-01']]),
 wd('Spurs Man',[['Chelsea F.C.','2023-01-01'],['Tottenham Hotspur F.C.','2026-09-01',null,true]]),
 wd('Same Name',[['Everton F.C.','2020-01-01','2026-08-01'],['Fulham F.C.','2026-08-01']]),
 wd('W Player',[['Arsenal W.F.C.','2021-01-01','2026-08-01'],['Chelsea F.C. Women','2026-08-01']])
];
const{moves,unresolved}=resolveTransfers(rows,players,'2026-06-01');
const move=id=>moves.find(m=>m.id===String(id));

test('Leão is moved from AC Milan to Galatasaray with EA\'s own club data',()=>{
 assert.deepEqual(move(241721),{id:'241721',name:'Rafael Leão',from:'AC Milan',to:'Galatasaray',since:'2026-08-29',loan:false,wikidata:move(241721).wikidata,club_team_id:'t-Galatasaray',club_logo_url:'logo-Galatasaray',league_name:'Trendyol Süper Lig'});
});

test('a loan to a club EA spells differently (Spurs) is found and marked as loan',()=>{
 assert.equal(move(5)?.to,'Spurs');assert.equal(move(5).loan,true);
});

test('no club is invented: a club EA does not have stays unresolved (Santos FC is not Santos Laguna)',()=>{
 assert.equal(move(2),undefined);
 assert.ok(unresolved.some(u=>u.name==='Rodinei'));
});

test('only when EA still shows a club the player left (same name, other player is untouched)',()=>{
 assert.equal(move(7),undefined);
});

test('women stay in women\'s clubs',()=>{
 assert.equal(move(8)?.to,'Chelsea');assert.equal(move(8).league_name,'Barclays WSL');
});

test('club names match across EA and Wikidata spellings',()=>{
 for(const[a,b]of[['Leverkusen','Bayer 04 Leverkusen'],["Nott'm Forest",'Nottingham Forest F.C.'],['Man Utd','Manchester United F.C.'],['FC Bayern München','FC Bayern Munich'],['N.E.C. Nijmegen','N.E.C.'],['SL Benfica','S.L. Benfica']])assert.ok(sameClub(a,b),`${a} = ${b}`);
 for(const[a,b]of[['Manchester City','Manchester United F.C.'],['Real Madrid','Real Sociedad']])assert.ok(!sameClub(a,b),`${a} != ${b}`);
});

test('the checked-in database has the late transfers (Leão at Galatasaray)',()=>{
 const csv=fs.readFileSync(path.join(root,'assets','players-db.csv'),'utf8');
 const leao=csv.split('\n').find(l=>l.startsWith('241721,'));
 assert.match(leao,/,Galatasaray,/);assert.match(leao,/Trendyol Süper Lig/);
 const saved=JSON.parse(fs.readFileSync(path.join(root,'data','club-transfers.json'),'utf8'));
 assert.ok(saved.moves.some(m=>m.id==='241721'&&m.to==='Galatasaray'),'data/club-transfers.json lists Leão');
 assert.ok(saved.moves.length>=50,`only ${saved.moves.length} transfers`);
});
