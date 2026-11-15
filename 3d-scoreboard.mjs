// Footera V21.429 "Anzeigetafel" (surprise 2026-11-15): two video boards in
// the arena, one above the balcony behind each goal. They show the real score,
// the minute and both club names; after a goal they flash "TOR!" in the
// scorer's club colour, then the scorer and the new score. Walk-out: ANPFIFF,
// final whistle: ENDSTAND. Presentation only: nothing is stored or sent.
// State is pure (scoreboardState), so the board is the same in every replay.

export const SCOREBOARD_VERSION='21.429-anzeigetafel';
// Plane size in metres and where they stand: behind both goals (z = ±z) and
// opposite the main stand (x = -x), on the balcony front at 12.5 m, in front
// of the upper tier's first rows.
export const BOARD={width:18,height:6.4,y:16,z:77.6,x:57.5};
export const GOAL_FLASH=3.2;

export function footeraScoreboardWanted(){try{return globalThis.localStorage?.getItem('footera-3d-scoreboard')!=='0'}catch(_){return true}}

const num=(v,f=0)=>Number.isFinite(Number(v))?Math.max(0,Math.round(Number(v))):f;
const clean=(s,f)=>String(s??'').replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,24)||f;

// What the board needs from a highlight event, read once per scene.
export function scoreboardInfo(event={},{ceremony=null,goalAt=null}={}){
 const e=event||{},goal=e.type==='goal'&&!ceremony;
 const scorer=e.team==='away'?'away':'home';
 const final=[num(e.homeScore),num(e.awayScore)];
 let before=final,after=final;
 if(goal&&Number.isFinite(Number(e.scoreBeforeHome))&&Number.isFinite(Number(e.scoreBeforeAway))){
  before=[num(e.scoreBeforeHome),num(e.scoreBeforeAway)];
  after=scorer==='home'?[before[0]+1,before[1]]:[before[0],before[1]+1];
 }
 else if(goal)before=scorer==='home'?[Math.max(0,final[0]-1),final[1]]:[final[0],Math.max(0,final[1]-1)];
 return{kind:ceremony==='kickoff'?'kickoff':ceremony?'fulltime':goal?'goal':'play',
  home:clean(e.homeName,'HEIM').toUpperCase(),away:clean(e.awayName,'GAST').toUpperCase(),
  minute:num(e.minute,0),scorer,scorerName:clean(e.playerName,''),
  before:ceremony==='kickoff'?[0,0]:before,after:ceremony==='kickoff'?[0,0]:after,
  goalAt:goal&&Number.isFinite(goalAt)?goalAt:null};
}

// What the board shows at scene time t. `seen` is the latest time already
// played, so a replay never takes the goal back off the board.
export function scoreboardState(info,t=0,seen=t){
 const at=Math.max(t,seen);
 if(info.kind==='kickoff')return{mode:'score',top:'ANPFIFF',score:[0,0],line:'',key:'k'};
 if(info.kind==='fulltime')return{mode:'score',top:'ENDSTAND',score:info.after,line:'',key:'f'};
 const minute=info.minute?`${info.minute}'`:'LIVE';
 if(info.goalAt==null)return{mode:'score',top:minute,score:info.after,line:'',key:'p'};
 // Replay (time runs back): the board holds the goal, steady and in colour.
 if(seen>t+.5&&seen>=info.goalAt)return{mode:'goal',top:'TOR!',on:true,score:info.after,line:info.scorerName,key:'gr'+(info.scorerName?'n':'')};
 const since=at-info.goalAt-.25;
 if(since<0)return{mode:'score',top:minute,score:info.before,line:'',key:'b'};
 if(since<GOAL_FLASH){const on=Math.floor(since/.28)%2===0;return{mode:'goal',top:'TOR!',on,score:info.after,line:info.scorerName,key:'g'+(on?1:0)+(since>1.4?'n':'')}}
 return{mode:'score',top:minute,score:info.after,line:info.scorerName?`⚽ ${info.scorerName} ${info.minute?info.minute+"'":''}`.trim():'',key:'a'};
}

function fit(ctx,text,max,size,weight='900',min=14){
 let s=size;ctx.font=`${weight} ${s}px Arial, sans-serif`;
 while(s>min&&ctx.measureText(text).width>max){s-=2;ctx.font=`${weight} ${s}px Arial, sans-serif`}
 return s;
}

// Draws one frame of the board on a 2D canvas (w ≈ 2.78 h).
// A long club name on the board: the full name if it reads, else its
// longest word ("BORUSSIA DORTMUND" -> "DORTMUND").
export function boardName(name,fits=n=>n.length<=12){
 const full=String(name||'').toUpperCase().trim();if(fits(full))return full;
 const words=full.split(/\s+/).filter(w=>!/^(FC|SC|SV|TSV|VFB|VFL|AC|AS|SSC|CF|CD|RB|BV|1\.)$/.test(w));
 return words.reduce((best,w)=>w.length>=best.length?w:best,'')||full;
}

export function drawScoreboard(ctx,w,h,info,state,colors={}){
 const home=colors.home||'#37df78',away=colors.away||'#d85a6a',scorerColour=info.scorer==='away'?away:home;
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#04080b';ctx.fillRect(0,0,w,h);
 if(state.mode==='goal'){
  const bg=ctx.createRadialGradient(w/2,h/2,h*.1,w/2,h/2,w*.6);
  bg.addColorStop(0,state.on?scorerColour:'#0b1418');bg.addColorStop(1,state.on?'#060a0c':'#04080b');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const late=state.key.endsWith('n')&&state.line,replay=state.key.startsWith('gr');
  fit(ctx,'TOR!',w*.8,replay?h*.4:late?h*.5:h*.68);
  ctx.lineWidth=h*.03;ctx.strokeStyle='#000000aa';ctx.fillStyle='#ffffff';
  const y=replay?h*.27:late?h*.36:h*.52;ctx.strokeText('TOR!',w/2,y);ctx.fillText('TOR!',w/2,y);
  if(late){fit(ctx,state.line.toUpperCase(),w*.86,h*.2,'800');ctx.fillStyle='#ffffff';ctx.fillText(state.line.toUpperCase(),w/2,replay?h*.6:h*.76)}
  if(replay){const text=`${info.home}  ${state.score[0]} : ${state.score[1]}  ${info.away}`;
   ctx.font=`800 ${Math.round(h*.13)}px Arial, sans-serif`;const short=ctx.measureText(text).width>w*.9?`${boardName(info.home,n=>n.length<=11)}  ${state.score[0]} : ${state.score[1]}  ${boardName(info.away,n=>n.length<=11)}`:text;
   fit(ctx,short,w*.9,h*.13,'800');ctx.fillStyle='#ffffffd0';ctx.fillText(short,w/2,h*.86)}
 }
 else{
  // Top strip: minute / ANPFIFF / ENDSTAND, with a small LIVE dot.
  ctx.fillStyle='#0d1b22';ctx.fillRect(0,0,w,h*.24);
  ctx.fillStyle='#69ff7f';ctx.beginPath();ctx.arc(w*.06,h*.12,h*.035,0,Math.PI*2);ctx.fill();
  fit(ctx,'FOOTERA',w*.2,h*.11,'900');ctx.textAlign='left';ctx.fillStyle='#bfe9ff';ctx.fillText('FOOTERA',w*.09,h*.125);
  ctx.textAlign='right';fit(ctx,state.top,w*.3,h*.15,'900');ctx.fillStyle=state.top==='ENDSTAND'||state.top==='ANPFIFF'?'#ffd84a':'#ffffff';ctx.fillText(state.top,w*.95,h*.125);
  ctx.textAlign='center';
  // Club colour bars, names and the score.
  const mid=state.line?h*.53:h*.6;
  ctx.fillStyle=home;ctx.fillRect(w*.03,mid-h*.17,w*.012,h*.34);
  ctx.fillStyle=away;ctx.fillRect(w*.958,mid-h*.17,w*.012,h*.34);
  ctx.fillStyle='#ffffff';
  for(const [name,x] of [[info.home,w*.2],[info.away,w*.8]]){
   ctx.font=`800 ${Math.round(h*.17)}px Arial, sans-serif`;
   const label=boardName(name,n=>ctx.measureText(n).width*.72<=w*.3);
   fit(ctx,label,w*.3,h*.17,'800');ctx.fillText(label,x,mid);
  }
  ctx.fillStyle='#111f27';ctx.fillRect(w*.37,mid-h*.2,w*.26,h*.4);
  fit(ctx,`${state.score[0]} : ${state.score[1]}`,w*.24,h*.32,'900');ctx.fillStyle='#ffffff';ctx.fillText(`${state.score[0]} : ${state.score[1]}`,w/2,mid+h*.01);
  if(state.line){fit(ctx,state.line,w*.8,h*.12,'700');ctx.fillStyle='#d8ff3e';ctx.fillText(state.line,w/2,h*.86)}
 }
 // LED pixel grid: the look of a real video wall up close.
 ctx.globalAlpha=.16;ctx.fillStyle='#000000';
 const step=Math.max(3,Math.round(h/90));for(let y=0;y<h;y+=step)ctx.fillRect(0,y,w,1);for(let x=0;x<w;x+=step)ctx.fillRect(x,0,1,h);
 ctx.restore();
}

export function createScoreboards(THREE,{group,track=o=>o,info,colors={},weak=false}){
 const w=weak?512:1024,h=Math.round(w/BOARD.width*BOARD.height);
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');
 const texture=track(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const screen=track(new THREE.MeshBasicMaterial({map:texture,fog:false,toneMapped:false,color:'#e6e6e6'}));
 const frame=track(new THREE.MeshBasicMaterial({color:'#11181c'}));
 const plane=track(new THREE.PlaneGeometry(BOARD.width,BOARD.height)),box=track(new THREE.BoxGeometry(BOARD.width+.6,BOARD.height+.6,.5));
 const legs=track(new THREE.BoxGeometry(.35,BOARD.y-BOARD.height/2-12.5,.35));
 const boards=new THREE.Group();boards.name='FooteraScoreboards';
 for(const side of [1,-1]){
  const g=new THREE.Group();g.position.set(0,BOARD.y,side*BOARD.z);g.rotation.y=side>0?Math.PI:0;
  const back=new THREE.Mesh(box,frame);back.position.z=-.28;g.add(back);
  const face=new THREE.Mesh(plane,screen);face.name='FooteraScoreboardScreen';g.add(face);
  for(const x of [-BOARD.width*.32,BOARD.width*.32]){const leg=new THREE.Mesh(legs,frame);leg.position.set(x,-(BOARD.height/2+(BOARD.y-BOARD.height/2-12.5)/2),-.28);g.add(leg)}
  boards.add(g);
 }
 {const g=boards.children[0].clone();g.position.set(-BOARD.x,BOARD.y,0);g.rotation.y=Math.PI/2;boards.add(g)}
 group.add(boards);
 let key='',seen=-Infinity;
 function update(t=0){
  seen=Math.max(seen,t);
  const s=scoreboardState(info,t,seen);
  if(s.key===key)return s;
  key=s.key;drawScoreboard(ctx,w,h,info,s,colors);texture.needsUpdate=true;return s;
 }
 update(0);
 return{group:boards,update,info:()=>({key,width:w,height:h})};
}
