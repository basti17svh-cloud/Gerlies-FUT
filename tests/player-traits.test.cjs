const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const official=require(path.join(root,'assets/player-traits.json'));
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const code=section('function first(raw,','function keyNameTeam(')+
 section('let PLAYER_TRAITS=null;','async function savePlayers(')+
 section('function eaObject(raw,','async function fetchJson(')+
 ['playerFoot','ratedStars','skillStars','weakFootStars','workRates','positionRoleLabel','stars'].map(name=>html.match(new RegExp(`^function ${name}\\(.*$`,'m'))?.[0]).join('\n');

function setup(){
 const ctx={leagueFromClub:(_team,league)=>league};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 ctx.traits=official.players;
 vm.runInContext('PLAYER_TRAITS=traits',ctx);
 return ctx
}

test('bundled FC 27 player traits are complete and do not turn all players into five stars',()=>{
 assert.deepEqual(official.fields,['skillMoves','weakFoot','preferredFoot','physical']);
 const rows=Object.values(official.players);
 assert.ok(rows.length>=17500);
 assert.ok(rows.filter(row=>row[0]===5).length<rows.length*.1);
 assert.ok(rows.filter(row=>row[1]===5).length<rows.length*.1);
 assert.deepEqual(official.players['239085'],[3,3,2,89]); // Haaland
 assert.deepEqual(official.players['231747'],[5,4,1,76]); // Mbappé
});

test('CSV players receive verified skills, weak foot and strong foot by ID',()=>{
 const ctx=setup();
 const p=ctx.normCSV({sofifa_id:'239085',short_name:'E. Haaland',long_name:'Erling Haaland',positions:'ST',
  overall:'91',shooting:'92',dribbling:'80',physical:'89',preferred_foot:'Left'});
 assert.equal(p.phy,89);
 assert.equal(ctx.stars(ctx.skillStars(p)),'–');
 assert.equal(ctx.stars(ctx.weakFootStars(p)),'–');
 ctx.applyPlayerTraits([p]);
 assert.equal(ctx.playerFoot(p),'Links');
 assert.equal(ctx.stars(ctx.skillStars(p)),'★★★☆☆');
 assert.equal(ctx.stars(ctx.weakFootStars(p)),'★★★☆☆');
 const unknown={id:'not-official',dri:99,sho:99};
 ctx.applyPlayerTraits([unknown]);
 assert.equal(ctx.stars(ctx.skillStars(unknown)),'–');
 assert.equal(ctx.stars(ctx.weakFootStars(unknown)),'–');
 assert.equal(ctx.playerFoot(unknown),'–');
 assert.equal(ctx.workRates(unknown),'–');
 assert.equal(ctx.positionRoleLabel(unknown),'–');
 const oldCache={id:'239085',phy:0};ctx.applyPlayerTraits([oldCache]);assert.equal(oldCache.phy,89);
});

test('EA API fields weakFootAbility and numeric preferredFoot are parsed',()=>{
 const ctx=setup(),a=ctx.normEAAsset({id:239085,firstName:'Erling',lastName:'Haaland',
  skillMoves:3,weakFootAbility:3,preferredFoot:2});
 assert.equal(a.weakFoot,3);
 assert.equal(a.skillMoves,3);
 assert.equal(a.preferredFoot,'Left');
 assert.equal(ctx.normEAAsset({preferredFoot:1}).preferredFoot,'Right');
});
