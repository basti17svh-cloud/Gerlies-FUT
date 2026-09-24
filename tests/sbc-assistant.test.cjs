const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=html.slice(html.indexOf('function sbcAssistantQuality('),html.indexOf('function renderSbcEditor('));
const positions=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'];
const player=(uid,position,rating=78,source='club')=>({uid,position,rating,quality:'gold',league:'Bundesliga',source});

function scenario(players,squad,options={}){
 const byUid=new Map(players.map(item=>[item.uid,item]));
 let draft={squad:[...squad,...Array(11-squad.length).fill(null)],test:options.test||Array(12).fill(null)};
 const messages=[];let writes=0;
 const ctx={
  SBCS:[{id:'sameleague',count:11,sameLeague:true,filter:item=>item.quality==='gold'}],
  activeSbcId:'sameleague',sbcAssistantState:{sort:'high',min:0,max:99,quality:'',league:'',ignorePosition:false,protectTeams:true,...options.assistant},
  FORMATIONS:{'4-3-3':positions.map(p=>({p}))},
  state:{club:players.filter(x=>x.source==='club'),sbcStorage:players.filter(x=>x.source==='storage')},
  sbcSourceItems:()=>players.map(item=>({item,source:item.source})),
  sbcDraft:()=>draft,sbcSetDraft:(_id,next)=>{draft=next;writes++},
  sbcItemRecord:uid=>{const item=byUid.get(uid);return item?{item}:null},
  sbcTeamUsageForUid:uid=>options.protected?.includes(uid)?['Team 1']:[],
  displayBase:item=>item,itemRating:item=>item.rating,rarityOf:item=>item.quality,
  resolvedAffiliation:item=>({league:item.league}),posFit:(item,position)=>item.position===position?1:0,
  sbcDraftStats:(sbc,next)=>{
   const items=next.squad.map(uid=>byUid.get(uid)).filter(Boolean);
   return{count:items.length,ok:items.length===sbc.count&&items.every(item=>sbc.filter(item))&&new Set(items.map(item=>item.league)).size===1};
  },
  toast:message=>messages.push(message),renderSBC:()=>{}
 };
 vm.createContext(ctx);vm.runInContext(source,ctx);vm.runInContext('runSbcAssistant()',ctx);
 return{draft,messages,writes,assistant:ctx.sbcAssistantState};
}

test('Ligamangel lässt die manuell gesetzten Karten und freien Plätze unverändert',()=>{
 const players=[player('manuell','GK'),...Array.from({length:5},(_,i)=>player(`k${i}`,'CM'))];
 const result=scenario(players,['manuell'],{assistant:{league:'Bundesliga',ignorePosition:true,protectTeams:false}});
 assert.equal(result.writes,0);
 assert.equal(result.draft.squad[0],'manuell');
 assert.equal(result.draft.squad.filter(Boolean).length,1);
 assert.match(result.messages[0],/Nicht genügend passende Spieler/);
 assert.ok(result.assistant);
});

test('fünf manuelle Karten bleiben, sechs freie Plätze werden positionsgerecht und ohne Duplikate ergänzt',()=>{
 const manual=positions.slice(0,5).map((position,i)=>player(`m${i}`,position));
 const remaining=positions.slice(5).map((position,i)=>player(`r${i}`,position,78,i===5?'storage':'club'));
 const players=[...manual,...remaining,player('geschuetzt','RW',99),player('testkarte','RW',84)];
 const result=scenario(players,manual.map(item=>item.uid),{test:['testkarte',...Array(11).fill(null)],protected:['geschuetzt']});
 assert.equal(result.writes,1);
 assert.deepEqual(Array.from(result.draft.squad.slice(0,5)),manual.map(item=>item.uid));
 assert.equal(new Set(result.draft.squad).size,11);
 assert.equal(result.draft.squad[10],'r5');
 assert.equal(result.draft.test[0],'testkarte');
 assert.match(result.messages[0],/6 Spieler eingesetzt/);
});
